// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FeatureCollection } from 'geojson';
import type { Topology } from 'topojson-specification';
import { geoMercator, geoPath } from 'd3-geo';
import {
  fetchGeographiesCache,
  getFeatures,
  prepareFeatures,
} from '../src/utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetched geography shape validation', () => {
  it.each([
    '{"type":"FeatureCollection","features":[null]}',
    '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Point"}}]}',
    '{"type":"Topology","objects":{"land":{"type":"Polygon","arcs":[[0]]}},"arcs":[]}',
  ])('rejects malformed network data before returning it: %s', async (body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(body, {
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    const url = 'https://8.8.8.8/fetched-shape.json';
    await expect(fetchGeographiesCache(url)).rejects.toMatchObject({
      type: 'VALIDATION_ERROR',
      geography: url,
    });
  });

  it.each<FeatureCollection | Topology>([
    { type: 'FeatureCollection', features: [] },
    {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: null,
          geometry: { type: 'Point', coordinates: [10, 20, 100] },
        },
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'GeometryCollection',
            geometries: [
              { type: 'Polygon', coordinates: [] },
              { type: 'LineString', coordinates: [] },
              { type: 'GeometryCollection', geometries: [] },
            ],
          },
        },
      ],
    },
    { type: 'Topology', objects: {}, arcs: [] },
    {
      type: 'Topology',
      objects: { land: { type: 'LineString', arcs: [-1] } },
      arcs: [
        [
          [0, 0],
          [10, 10],
        ],
      ],
      transform: { scale: [0.1, 0.1], translate: [-180, -90] },
    },
    {
      type: 'Topology',
      objects: {
        land: {
          type: 'GeometryCollection',
          geometries: [
            { type: null },
            { type: 'Point', coordinates: [10, 20] },
            { type: 'Polygon', arcs: [[0]] },
          ],
        },
      },
      arcs: [
        [
          [0, 0],
          [10, 0],
          [0, 10],
          [-10, -10],
        ],
      ],
      transform: { scale: [1, 1], translate: [0, 0] },
    },
  ])(
    'preserves supported $type data through fetching and preparation',
    async (data) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(JSON.stringify(data), {
              headers: { 'content-type': 'application/json' },
            }),
        ),
      );
      const fetched = await fetchGeographiesCache(
        'https://8.8.8.8/valid-shape.json',
      );
      expect(fetched).toEqual(data);
      expect(() =>
        prepareFeatures(getFeatures(fetched), geoPath(geoMercator())),
      ).not.toThrow();
    },
  );
});
