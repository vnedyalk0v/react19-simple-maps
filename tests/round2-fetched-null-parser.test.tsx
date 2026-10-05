import { StrictMode } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { ComposableMap, Geographies } from '../src';
import { fetchGeographiesCache, getFeatures } from '../src/utils';

const point: Feature<Geometry> = {
  type: 'Feature',
  id: 'point',
  properties: {},
  geometry: { type: 'Point', coordinates: [10, 20] },
};
const nullable: Feature<null> = {
  type: 'Feature',
  id: 'unlocated',
  properties: {},
  geometry: null,
};

function serveCollection(features: Feature<Geometry | null>[]) {
  const data: FeatureCollection<Geometry | null> = {
    type: 'FeatureCollection',
    features,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(data), {
          headers: { 'content-type': 'application/geo+json' },
        }),
    ),
  );
  return data;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('nullable fetched geography parser contract', () => {
  it('preserves fetched null geometry but omits it from prepared parser input', async () => {
    const data = serveCollection([nullable, point]);
    const fetched = await fetchGeographiesCache(
      'https://8.8.8.8/round2-null-parser-utils.json',
    );
    expect(fetched).toEqual(data);
    const features = getFeatures(fetched, (items) =>
      items.filter((item) => item.geometry.type === 'Point'),
    );
    expect(features.map((item) => item.id)).toEqual(['point']);
    expect(getFeatures(fetched).map((item) => item.id)).toEqual(['point']);
  });

  it.each([
    { name: 'mixed', features: [nullable, point], count: 1 },
    { name: 'all-null', features: [nullable], count: 0 },
  ])(
    'renders $name URL data with a typed geometry parser',
    async ({ name, features, count }) => {
      serveCollection(features);
      const parser = vi.fn((items: Feature<Geometry>[]) =>
        items.filter((item) => item.geometry.type === 'Point'),
      );
      const onError = vi.fn();
      const view = render(
        <StrictMode>
          <ComposableMap>
            <Geographies
              geography={`https://8.8.8.8/round2-null-parser-${name}.json`}
              parseGeographies={parser}
              errorBoundary
              onGeographyError={onError}
              fallback={() => <text data-testid="parser-crash">crashed</text>}
            >
              {({ geographies, path }) =>
                geographies.map((item) => (
                  <path key={String(item.id)} d={path(item) ?? ''} />
                ))
              }
            </Geographies>
          </ComposableMap>
        </StrictMode>,
      );
      await waitFor(() => expect(parser).toHaveBeenCalled());
      await waitFor(() =>
        expect(view.container.querySelector('.rsm-loading-text')).toBeNull(),
      );
      expect(view.queryByTestId('parser-crash')).toBeNull();
      expect(onError).not.toHaveBeenCalled();
      expect(view.container.querySelectorAll('path')).toHaveLength(count);
      expect(
        parser.mock.calls.every(([items]) =>
          items.every((item) => item.geometry !== null),
        ),
      ).toBe(true);
    },
  );
});
