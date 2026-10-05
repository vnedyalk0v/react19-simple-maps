// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import {
  fetchGeographies,
  fetchGeographiesCache,
  getFeatures,
  getMesh,
  isFeatureCollection,
} from '../src/utils';

const collection: FeatureCollection<Geometry | null> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: null, properties: {} },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [10, 20] },
      properties: {},
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('raw fetched GeoJSON geometry contracts', () => {
  it.each([fetchGeographiesCache, fetchGeographies])(
    'preserves nullable raw data and supplies non-null parser features',
    async (fetchData) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(JSON.stringify(collection), {
              headers: { 'content-type': 'application/geo+json' },
            }),
        ),
      );
      const data = await fetchData(
        'https://8.8.8.8/round4-fetched-null-output.json',
      );
      if (!data || data.type !== 'FeatureCollection') {
        throw new Error('Expected FeatureCollection response');
      }
      expect(data).toEqual(collection);
      expect(data.features.map((feature) => feature.geometry?.type)).toEqual([
        undefined,
        'Point',
      ]);
      expect(isFeatureCollection(data)).toBe(false);
      expect(getMesh(data)).toBeNull();
      expect(
        getFeatures(data, (features) =>
          features.filter((feature) => feature.geometry.type === 'Point'),
        ).map((feature) => feature.geometry.type),
      ).toEqual(['Point']);
    },
  );
});
