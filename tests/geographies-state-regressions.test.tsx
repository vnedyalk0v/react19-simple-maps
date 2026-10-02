import { StrictMode, act, useEffect } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import ComposableMap from '../src/components/ComposableMap';
import Geographies from '../src/components/Geographies';
import Geography from '../src/components/Geography';
import GeographyErrorBoundary from '../src/components/GeographyErrorBoundary';
import useGeographies from '../src/components/useGeographies';
import { MapDebugger } from '../src/utils/debugging';
import { fetchGeographiesCache } from '../src/utils/geography-fetching';
import type { GeographyData } from '../src/types';

vi.mock('../src/utils/geography-fetching', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/geography-fetching')>()),
  fetchGeographiesCache: vi.fn(),
}));

vi.mock('../src/utils/preloading', () => ({ preloadGeography: vi.fn() }));

const fetchMock = vi.mocked(fetchGeographiesCache);

type Settle = {
  resolve: (data: FeatureCollection) => void;
  reject: (error: Error) => void;
};

/** Each fetch call returns a pending promise settled manually per URL. */
function controlFetch() {
  const pending = new Map<string, Settle[]>();
  fetchMock.mockImplementation(
    (url: string) =>
      new Promise((resolve, reject) => {
        const list = pending.get(url) ?? [];
        list.push({ resolve, reject });
        pending.set(url, list);
      }),
  );
  return {
    resolve: async (url: string, data: FeatureCollection) => {
      await act(async () => {
        pending.get(url)?.forEach((p) => p.resolve(data));
        pending.delete(url);
      });
    },
    reject: async (url: string, error: Error) => {
      await act(async () => {
        pending.get(url)?.forEach((p) => p.reject(error));
        pending.delete(url);
      });
    },
  };
}

const fc = (name: string, x = 0): FeatureCollection<Geometry> => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: name,
      properties: { name },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [x, 0],
            [x, 10],
            [x + 10, 10],
            [x + 10, 0],
            [x, 0],
          ],
        ],
      },
    },
  ],
});

type NamedGeo = Feature & { rsmKey: string; properties: { name: string } };

const URL_A = 'https://a.example.com/a.json';
const URL_B = 'https://b.example.com/b.json';

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  MapDebugger.getInstance().setDebugMode(false);
  vi.restoreAllMocks();
});

describe('useGeographies URL state', () => {
  it('does not render the previous URL features while the next URL is pending', async () => {
    const net = controlFetch();
    const seen: string[][] = [];
    const children = ({ geographies }: { geographies: NamedGeo[] }) => {
      seen.push(geographies.map((g) => g.properties.name));
      return geographies.map((g) => <Geography key={g.rsmKey} geography={g} />);
    };
    const view = (url: string) => (
      <StrictMode>
        <ComposableMap>
          <Geographies geography={url}>{children as never}</Geographies>
        </ComposableMap>
      </StrictMode>
    );

    const { container, rerender } = render(view(URL_A));
    await net.resolve(URL_A, fc('A'));
    expect(seen.at(-1)).toEqual(['A']);

    seen.length = 0;
    rerender(view(URL_B));
    expect(seen).toEqual([]);
    expect(container.querySelector('.rsm-loading-text')).not.toBeNull();

    await net.resolve(URL_B, fc('B'));
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((names) => names.join() === 'B')).toBe(true);
  });

  it('reports isLoading on the very first render of a URL', () => {
    controlFetch();
    const states: boolean[] = [];
    function Probe() {
      states.push(useGeographies({ geography: URL_A }).isLoading);
      return null;
    }
    render(
      <ComposableMap>
        <Probe />
      </ComposableMap>,
    );
    expect(states.length).toBeGreaterThan(0);
    expect(states.every(Boolean)).toBe(true);
  });

  it('does not resurface an old URL error after URL -> object -> URL', async () => {
    const net = controlFetch();
    const onError = vi.fn();
    const fallback = vi.fn(() => <text data-testid="fallback">failed</text>);
    const view = (geography: string | FeatureCollection) => (
      <ComposableMap>
        <Geographies
          geography={geography}
          onGeographyError={onError}
          fallback={fallback}
        >
          {({ geographies }) =>
            geographies.map((g) => <Geography key={g.rsmKey} geography={g} />)
          }
        </Geographies>
      </ComposableMap>
    );

    const { container, rerender } = render(view(URL_A));
    await net.reject(URL_A, new Error('A failed'));
    expect(onError).toHaveBeenCalledTimes(1);

    rerender(view(fc('inline')));
    fallback.mockClear();
    rerender(view(URL_B));
    expect(fallback).not.toHaveBeenCalled();
    expect(container.querySelector('.rsm-loading-text')).not.toBeNull();

    await net.resolve(URL_B, fc('B'));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
    expect(container.querySelectorAll('path.rsm-geography')).toHaveLength(1);
  });

  it('refetch after a successful load requests the URL again and shows loading', async () => {
    const net = controlFetch();
    let api: GeographyData | undefined;
    function Probe() {
      api = useGeographies({ geography: URL_A });
      return null;
    }
    render(
      <ComposableMap>
        <Probe />
      </ComposableMap>,
    );
    await net.resolve(URL_A, fc('A'));
    expect(api?.isLoading).toBe(false);
    expect(api?.geographies).toHaveLength(1);
    const callsBefore = fetchMock.mock.calls.length;

    act(() => api?.refetch?.());
    expect(fetchMock.mock.calls.length).toBe(callsBefore + 1);
    expect(api?.isLoading).toBe(true);
    expect(api?.geographies).toHaveLength(0);

    await net.resolve(URL_A, fc('A2'));
    expect(api?.isLoading).toBe(false);
    expect(api?.geographies.map((g) => g.properties?.name)).toEqual(['A2']);
  });
});

describe('geography loading debug output', () => {
  it('logs only when global debug mode is opted in', async () => {
    const group = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const net = controlFetch();
    const loadingGroups = () =>
      group.mock.calls.filter((c) => String(c[0]).includes('Geography'));
    const view = (url: string) => (
      <ComposableMap>
        <Geographies geography={url}>{() => null}</Geographies>
      </ComposableMap>
    );

    const { rerender } = render(view(URL_A));
    await net.resolve(URL_A, fc('A'));
    expect(loadingGroups()).toEqual([]);

    MapDebugger.getInstance().setDebugMode(true);
    rerender(view(URL_B));
    await net.resolve(URL_B, fc('B'));
    expect(loadingGroups().length).toBeGreaterThan(0);
  });
});

describe('Geographies error boundary reset', () => {
  const throwingChildren = ({ geographies }: { geographies: NamedGeo[] }) => {
    if (geographies.some((g) => g.properties.name === 'bad')) {
      throw new Error('boom');
    }
    return geographies.map((g) => <Geography key={g.rsmKey} geography={g} />);
  };
  const fallback = () => <text data-testid="fallback">fallback</text>;
  const view = (geography: string | FeatureCollection) => (
    <StrictMode>
      <ComposableMap>
        <Geographies geography={geography} errorBoundary fallback={fallback}>
          {throwingChildren as never}
        </Geographies>
      </ComposableMap>
    </StrictMode>
  );

  it('recovers when switching to a different inline geography', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, rerender } = render(view(fc('bad')));
    expect(container.querySelector('[data-testid=fallback]')).not.toBeNull();

    rerender(view(fc('good', 20)));
    expect(container.querySelector('[data-testid=fallback]')).toBeNull();
    expect(container.querySelectorAll('path.rsm-geography')).toHaveLength(1);
  });

  it('keeps healthy content mounted when the geography changes', () => {
    let mounts = 0;
    function Probe() {
      useEffect(() => {
        mounts += 1;
      }, []);
      return null;
    }
    const healthy = (geography: FeatureCollection) => (
      <ComposableMap>
        <Geographies geography={geography} errorBoundary>
          {() => <Probe />}
        </Geographies>
      </ComposableMap>
    );

    const { rerender } = render(healthy(fc('one')));
    rerender(healthy(fc('two')));
    rerender(healthy(fc('three')));
    expect(mounts).toBe(1);
  });

  it('recovers when switching to a different geography URL', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const net = controlFetch();
    const { container, rerender } = render(view(URL_A));
    await net.resolve(URL_A, fc('bad'));
    expect(container.querySelector('[data-testid=fallback]')).not.toBeNull();

    rerender(view(URL_B));
    await net.resolve(URL_B, fc('good'));
    expect(container.querySelector('[data-testid=fallback]')).toBeNull();
    expect(container.querySelectorAll('path.rsm-geography')).toHaveLength(1);
  });
});

describe('GeographyErrorBoundary without a process global', () => {
  it('renders the fallback when a child throws in unbundled browser ESM', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    const Thrower = () => {
      throw new Error('child failed');
    };
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'process');
    Object.defineProperty(globalThis, 'process', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      const { container } = render(
        <svg>
          <GeographyErrorBoundary
            onError={onError}
            fallback={() => <text data-testid="fallback">fallback</text>}
          >
            <Thrower />
          </GeographyErrorBoundary>
        </svg>,
      );
      expect(onError).toHaveBeenCalledTimes(1);
      expect(container.querySelector('[data-testid=fallback]')).not.toBeNull();
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'process', descriptor);
    }
  });
});

describe('GeographyErrorBoundary resetKey', () => {
  it('clears a caught error only when resetKey changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Child = ({ fail }: { fail: boolean }) => {
      if (fail) throw new Error('boom');
      return <text data-testid="ok">ok</text>;
    };
    const fallback = () => <text data-testid="fallback">fallback</text>;
    const view = (resetKey: string, fail: boolean) => (
      <svg>
        <GeographyErrorBoundary resetKey={resetKey} fallback={fallback}>
          <Child fail={fail} />
        </GeographyErrorBoundary>
      </svg>
    );

    const { container, rerender } = render(view('a', true));
    expect(container.querySelector('[data-testid=fallback]')).not.toBeNull();

    rerender(view('a', false));
    expect(container.querySelector('[data-testid=fallback]')).not.toBeNull();

    rerender(view('b', false));
    expect(container.querySelector('[data-testid=ok]')).not.toBeNull();
  });
});
