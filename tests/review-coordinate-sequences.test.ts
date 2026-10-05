// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Topology } from 'topojson-specification';
import {
  fetchGeographiesCache,
  isValidGeometry,
  isTopology,
  validateGeographyData,
} from '../src/utils';

const invalidGeometries: unknown[] = [
  { type: 'LineString', coordinates: [[0, 0]] },
  { type: 'MultiLineString', coordinates: [[], [[0, 0]]] },
  {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0, 0],
      ],
    ],
  },
  {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [0, 0],
      ],
    ],
  },
  {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0, 10],
        [10, 0],
        [1, 1],
      ],
    ],
  },
  {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [0, 0],
          [0, 10],
          [10, 0],
          [1, 1],
        ],
      ],
    ],
  },
  {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0, 1],
        [0, 10, 1],
        [10, 0, 1],
        [0, 0, 2],
      ],
    ],
  },
  {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0, 1],
        [0, 10, 1],
        [10, 0, 1],
        [0, 0],
      ],
    ],
  },
  {
    type: 'GeometryCollection',
    geometries: [{ type: 'LineString', coordinates: [[0, 0]] }],
  },
];
const collection = (geometry: unknown) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: {}, geometry }],
});

afterEach(() => vi.unstubAllGlobals());

describe('GeoJSON coordinate sequence validation', () => {
  it.each(invalidGeometries)(
    'rejects invalid sequences through guards and validation: %j',
    (geometry) => {
      expect(isValidGeometry(geometry)).toBe(false);
      expect(() => validateGeographyData(collection(geometry))).toThrow();
    },
  );

  it.each(invalidGeometries)(
    'rejects malformed downloaded sequences: %j',
    async (geometry) => {
      const url = 'https://8.8.8.8/review-coordinate-sequences.json';
      vi.stubGlobal(
        'fetch',
        async () =>
          new Response(JSON.stringify(collection(geometry)), {
            headers: { 'content-type': 'application/json' },
          }),
      );
      await expect(fetchGeographiesCache(url)).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        geography: url,
      });
    },
  );

  it.each([
    { type: 'LineString', coordinates: [] },
    {
      type: 'MultiLineString',
      coordinates: [
        [],
        [
          [0, 0],
          [1, 1],
        ],
      ],
    },
    { type: 'Polygon', coordinates: [] },
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
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0, 1],
          [0, 10, 1],
          [10, 0, 1],
          [0, 0, 1],
        ],
      ],
    },
  ])('preserves valid and intentionally empty geometry: %j', (geometry) => {
    expect(isValidGeometry(geometry)).toBe(true);
    expect(() => validateGeographyData(collection(geometry))).not.toThrow();
  });

  it('preserves rejection of empty polygon rings', () => {
    expect(isValidGeometry({ type: 'Polygon', coordinates: [[]] })).toBe(false);
  });

  it('preserves separate TopoJSON arc validation', () => {
    const data: Topology = {
      type: 'Topology',
      objects: { land: { type: 'LineString', arcs: [0] } },
      arcs: [[[0, 0]]],
    };
    expect(isTopology(data)).toBe(true);
    expect(() => validateGeographyData(data)).not.toThrow();
  });
});
