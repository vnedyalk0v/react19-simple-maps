import { StrictMode, act, createRef, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoomTransform } from 'd3-zoom';
import { select } from 'd3-selection';
import ComposableMap from '../src/components/ComposableMap';
import ZoomableGroup from '../src/components/ZoomableGroup';
import Annotation from '../src/components/Annotation';
import Geography from '../src/components/Geography';
import Geographies from '../src/components/Geographies';
import MapWithMetadata from '../src/components/MapWithMetadata';
import { MapDebugger } from '../src/utils/debugging';
import {
  createCoordinates,
  type Position,
  type PreparedFeature,
} from '../src/types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

type View = ReturnType<typeof render>;

const zoomTarget = (view: View) =>
  view.container.querySelector('.rsm-zoomable-group')!
    .parentElement as unknown as SVGGElement;

function mouse(target: Element | Window, type: string, x: number, y: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  // d3-zoom reads the view to attach drag listeners; jsdom rejects it in the init dict.
  Object.defineProperty(event, 'view', { value: window });
  act(() => {
    fireEvent(target, event);
  });
}

function drag(target: Element, steps: [number, number][]) {
  vi.useFakeTimers();
  mouse(target, 'mousedown', 100, 100);
  for (const [x, y] of steps) mouse(window, 'mousemove', x, y);
  const [x, y] = steps[steps.length - 1]!;
  mouse(window, 'mouseup', x, y);
  // Flush d3-drag's post-drag click suppressor so it cannot leak into later tests.
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
}

const metadata = {
  title: 't',
  description: 'd',
  keywords: [],
  author: '',
  canonicalUrl: '',
};

describe('ZoomableGroup gestures', () => {
  it('keeps following a drag and ends it when center is controlled via onMove', () => {
    const onMoveEnd = vi.fn();
    function Controlled() {
      const [pos, setPos] = useState<Position>({
        coordinates: createCoordinates(0, 0),
        zoom: 1,
      });
      return (
        <ComposableMap>
          <ZoomableGroup
            center={pos.coordinates}
            zoom={pos.zoom}
            onMove={setPos}
            onMoveEnd={onMoveEnd}
          />
        </ComposableMap>
      );
    }
    const view = render(<Controlled />);
    const target = zoomTarget(view);
    drag(target, [
      [110, 105],
      [130, 115],
      [150, 125],
    ]);
    expect(zoomTransform(target).x).toBeCloseTo(50);
    expect(onMoveEnd).toHaveBeenCalledTimes(1);
  });

  it('keeps applying wheel ticks and ends the gesture when zoom is controlled via onMove', () => {
    vi.useFakeTimers();
    const onMoveEnd = vi.fn();
    function Controlled() {
      const [pos, setPos] = useState<Position>({
        coordinates: createCoordinates(0, 0),
        zoom: 1,
      });
      return (
        <ComposableMap>
          <ZoomableGroup
            center={pos.coordinates}
            zoom={pos.zoom}
            onMove={setPos}
            onMoveEnd={onMoveEnd}
          />
        </ComposableMap>
      );
    }
    const view = render(
      <StrictMode>
        <Controlled />
      </StrictMode>,
    );
    const target = zoomTarget(view);
    const wheel = () =>
      act(() => {
        fireEvent.wheel(target, { deltaY: -100, clientX: 400, clientY: 300 });
      });
    wheel();
    const afterFirst = zoomTransform(target).k;
    wheel();
    expect(zoomTransform(target).k).toBeGreaterThan(afterFirst);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onMoveEnd).toHaveBeenCalledTimes(1);
  });

  it('does not rebind zoom listeners on an identical parent rerender', () => {
    const ui = (
      <ComposableMap>
        <ZoomableGroup onMove={() => {}} />
      </ComposableMap>
    );
    const view = render(ui);
    const target = zoomTarget(view);
    const before = select(target).on('mousedown.zoom');
    view.rerender(
      <ComposableMap>
        <ZoomableGroup onMove={() => {}} />
      </ComposableMap>,
    );
    expect(select(target).on('mousedown.zoom')).toBe(before);
  });

  it('calls onMoveEnd with the latest render closure', () => {
    const seen: number[] = [];
    function Parent() {
      const [count, setCount] = useState(0);
      return (
        <ComposableMap>
          <ZoomableGroup
            onMove={() => setCount((c) => c + 1)}
            onMoveEnd={() => seen.push(count)}
          />
          <text data-testid="count">{count}</text>
        </ComposableMap>
      );
    }
    const view = render(<Parent />);
    drag(zoomTarget(view), [
      [110, 105],
      [130, 115],
      [150, 125],
    ]);
    const rendered = Number(view.getByTestId('count').textContent);
    expect(rendered).toBeGreaterThan(0);
    expect(seen).toEqual([rendered]);
  });
});

describe('Annotation', () => {
  it('draws a curved connector in local coordinates', () => {
    const view = render(
      <ComposableMap>
        <Annotation subject={createCoordinates(0, 0)} dx={30} dy={20} curve={1}>
          <text>label</text>
        </Annotation>
      </ComposableMap>,
    );
    const path = view.container.querySelector('.rsm-annotation path')!;
    expect(path.getAttribute('d')).toBe('M0,0 Q-30,0 -30,-20');
  });
});

describe('MapWithMetadata', () => {
  it('forwards ref to the underlying svg', () => {
    const ref = createRef<SVGSVGElement>();
    render(<MapWithMetadata ref={ref} metadata={metadata} />);
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  it('does not preload a nonexistent font', () => {
    render(<MapWithMetadata metadata={metadata} />);
    expect(document.querySelector('link[rel="preload"]')).toBeNull();
  });
});

describe('ComposableMap', () => {
  it('does not forward onGeographyError or fallback to the svg', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(
      <ComposableMap
        onGeographyError={() => {}}
        fallback={<text>fallback</text>}
      />,
    );
    const svg = view.container.querySelector('svg')!;
    expect(svg.hasAttribute('fallback')).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});

describe('debug logging', () => {
  const resetDebugger = () => {
    (
      MapDebugger as unknown as { instance?: MapDebugger | undefined }
    ).instance = undefined;
  };
  const spyConsole = () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    return vi.spyOn(console, 'group').mockImplementation(() => {});
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    resetDebugger();
  });

  it('honors REACT_SIMPLE_MAPS_DEBUG unless a map opts out', () => {
    vi.stubEnv('REACT_SIMPLE_MAPS_DEBUG', 'true');
    resetDebugger();
    const group = spyConsole();
    const view = render(<ComposableMap />);
    expect(group).toHaveBeenCalledTimes(1);
    group.mockClear();
    view.rerender(<ComposableMap debug={false} width={900} />);
    expect(group).not.toHaveBeenCalled();
  });

  it('keeps logging for a debug map regardless of sibling maps', () => {
    resetDebugger();
    const group = spyConsole();
    const ui = (width: number) => (
      <>
        <ComposableMap debug width={width} />
        <ComposableMap />
      </>
    );
    const view = render(ui(800));
    group.mockClear();
    view.rerender(ui(900));
    expect(group).toHaveBeenCalledTimes(1);
  });

  it('logs without a global process object', () => {
    resetDebugger();
    spyConsole();
    vi.stubGlobal('process', undefined);
    try {
      const mapDebugger = MapDebugger.getInstance();
      mapDebugger.setDebugMode(true);
      expect(() => mapDebugger.logRender('ComposableMap')).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('Geographies render prop', () => {
  it('exposes prepared features with rsmKey and svgPath', () => {
    const keys: string[] = [];
    render(
      <ComposableMap>
        <Geographies
          geography={{
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                id: 'a',
                properties: {},
                geometry: { type: 'Point', coordinates: [0, 0] },
              },
            ],
          }}
        >
          {({ geographies }) =>
            geographies.map((geo) => {
              // Typed access (no cast) keeps the README Quick Start pattern compiling.
              keys.push(geo.rsmKey);
              return <path key={geo.rsmKey} d={geo.svgPath} />;
            })
          }
        </Geographies>
      </ComposableMap>,
    );
    expect(keys[0]).toEqual(expect.any(String));
  });
});

describe('Geography keyboard access', () => {
  const feature = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [0, 0] },
    svgPath: 'M0,0',
    rsmKey: 'a',
  } as PreparedFeature;

  it('stays focusable but is not a button without onClick', () => {
    const view = render(
      <svg>
        <Geography geography={feature} />
      </svg>,
    );
    const path = view.container.querySelector('path')!;
    expect(path.getAttribute('tabindex')).toBe('0');
    expect(path.hasAttribute('role')).toBe(false);
  });

  it('activates onClick with Enter and Space and respects user onKeyDown', () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const view = render(
      <svg>
        <Geography
          geography={feature}
          onClick={onClick}
          onKeyDown={onKeyDown}
        />
      </svg>,
    );
    const path = view.container.querySelector('path')!;
    expect(path.getAttribute('tabindex')).toBe('0');
    expect(path.getAttribute('role')).toBe('button');
    fireEvent.keyDown(path, { key: 'Enter' });
    fireEvent.keyDown(path, { key: ' ' });
    fireEvent.keyDown(path, { key: 'a' });
    expect(onKeyDown).toHaveBeenCalledTimes(3);
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick.mock.calls[0]?.[1]?.geography).toBe(feature);
  });

  it('respects user tabIndex/role overrides and prevented keydowns', () => {
    const onClick = vi.fn();
    const view = render(
      <svg>
        <Geography
          geography={feature}
          onClick={onClick}
          tabIndex={-1}
          role="link"
          onKeyDown={(event) => event.preventDefault()}
        />
      </svg>,
    );
    const path = view.container.querySelector('path')!;
    expect(path.getAttribute('tabindex')).toBe('-1');
    expect(path.getAttribute('role')).toBe('link');
    fireEvent.keyDown(path, { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
  });
});
