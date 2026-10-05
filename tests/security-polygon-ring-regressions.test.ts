// @vitest-environment node
import { geoEqualEarth, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchGeographiesCache,
  getFeatures,
  isFeatureCollection,
  isValidGeometry,
  prepareFeatures,
} from '../src/utils';

const invalidPolygons: Geometry[] = [
  { type: 'Polygon', coordinates: [[]] },
  { type: 'Polygon', coordinates: [[[0, 0]]] },
  { type: 'MultiPolygon', coordinates: [[[]]] },
  { type: 'MultiPolygon', coordinates: [[[[0, 0]]]] },
  {
    type: 'GeometryCollection',
    geometries: [{ type: 'Polygon', coordinates: [[]] }],
  },
];
const collection = (geometry: Geometry): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: {}, geometry }],
});

afterEach(() => vi.unstubAllGlobals());

describe('polygon ring safety at public geography boundaries', () => {
  it.each(invalidPolygons)(
    'rejects a non-renderable $type ring',
    (geometry) => {
      const data = collection(geometry);
      expect(isValidGeometry(geometry)).toBe(false);
      expect(isFeatureCollection(data)).toBe(false);
      // Guarded preparation must not let malformed rings reach the projection.
      expect(() => {
        if (isFeatureCollection(data)) {
          prepareFeatures(getFeatures(data), geoPath(geoEqualEarth()));
        }
      }).not.toThrow();
    },
  );

  it.each(invalidPolygons)(
    'rejects downloaded $type rings as loading validation errors',
    async (geometry) => {
      const url = 'https://8.8.8.8/non-renderable-polygon.json';
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(JSON.stringify(collection(geometry)), {
              headers: { 'content-type': 'application/json' },
            }),
        ),
      );
      await expect(fetchGeographiesCache(url)).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        geography: url,
      });
    },
  );

  it.each<Geometry>([
    { type: 'Polygon', coordinates: [] },
    { type: 'MultiPolygon', coordinates: [] },
    { type: 'MultiPolygon', coordinates: [[]] },
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 10],
          [10, 0],
          [0, 0],
        ],
      ],
    },
  ])('preserves renderable $type data', (geometry) => {
    const data = collection(geometry);
    expect(isValidGeometry(geometry)).toBe(true);
    expect(isFeatureCollection(data)).toBe(true);
    expect(() =>
      prepareFeatures(getFeatures(data), geoPath(geoEqualEarth())),
    ).not.toThrow();
  });
});
