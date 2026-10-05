// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { geoMercator, geoPath } from 'd3-geo';
import {
  fetchGeographiesCache,
  getFeatures,
  prepareFeatures,
  isFeature,
  isFeatureCollection,
} from '../src/utils';

afterEach(() => vi.unstubAllGlobals());

describe('nullable URL-loaded GeoJSON geometry compatibility', () => {
  it.each([
    {
      body: '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":null}]}',
      paths: 0,
    },
    {
      body: '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":null},{"type":"Feature","id":"point","properties":{},"geometry":{"type":"Point","coordinates":[10,20]}}]}',
      paths: 1,
    },
  ])(
    'preserves nullable network data and prepares $paths paths',
    async ({ body, paths }) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(body, {
              headers: { 'content-type': 'application/json' },
            }),
        ),
      );
      const fetched = await fetchGeographiesCache(
        'https://8.8.8.8/null-geometry.json',
      );
      const untrusted: unknown = JSON.parse(body);
      expect(fetched).toEqual(untrusted);
      const prepared = prepareFeatures(
        getFeatures(fetched),
        geoPath(geoMercator()),
      );
      expect(prepared).toHaveLength(paths);
      if (paths > 0) {
        expect(prepared[0]?.id).toBe('point');
        expect(prepared[0]?.svgPath).toMatch(/^M/);
      }
      expect(isFeatureCollection(untrusted)).toBe(false);
      expect(
        isFeature({ type: 'Feature', properties: {}, geometry: null }),
      ).toBe(false);
    },
  );
});
