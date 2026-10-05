// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Topology } from 'topojson-specification';
import {
  fetchGeographiesCache,
  getFeatures,
  isTopology,
  isValidGeometry,
} from '../src/utils';

function topology(geometry: unknown): unknown {
  return { type: 'Topology', objects: { land: geometry }, arcs: [] };
}

const invalidMetadata = [
  { properties: 'country' },
  { properties: 42 },
  { properties: [] },
  { id: { code: 1 } },
  { id: true },
  { id: [] },
];

afterEach(() => vi.unstubAllGlobals());

describe('TopoJSON metadata validation', () => {
  it.each(invalidMetadata)(
    'rejects invalid metadata on every geometry kind: %j',
    (metadata) => {
      for (const geometry of [
        { type: 'Point', coordinates: [0, 0], ...metadata },
        { type: 'GeometryCollection', geometries: [], ...metadata },
        { type: null, ...metadata },
      ]) {
        expect(isTopology(topology(geometry))).toBe(false);
        expect(
          isTopology(
            topology({ type: 'GeometryCollection', geometries: [geometry] }),
          ),
        ).toBe(false);
      }
    },
  );

  it('rejects primitive properties before a narrowed parser enumerates them', () => {
    const data = topology({
      type: 'GeometryCollection',
      geometries: [
        { type: 'Point', coordinates: [0, 0], properties: 'country' },
      ],
    });
    expect(() => {
      if (isTopology(data)) {
        getFeatures(data, (features) =>
          features.filter((feature) => {
            if (feature.properties === null) return true;
            return Reflect.ownKeys(feature.properties).length >= 0;
          }),
        );
      }
    }).not.toThrow();
    expect(isTopology(data)).toBe(false);
  });

  it('rejects non-scalar ids before a narrowed parser formats them', () => {
    const data = topology({
      type: 'GeometryCollection',
      geometries: [{ type: 'Point', coordinates: [0, 0], id: { code: 1 } }],
    });
    expect(() => {
      if (isTopology(data)) {
        getFeatures(data, (features) =>
          features.filter((feature) => {
            const id = feature.id;
            if (id === undefined) return true;
            return typeof id === 'string'
              ? id.toUpperCase().length >= 0
              : id.toFixed(0).length >= 0;
          }),
        );
      }
    }).not.toThrow();
    expect(isTopology(data)).toBe(false);
  });

  it.each([{ properties: 'country' }, { id: { code: 1 } }])(
    'rejects malformed downloaded metadata: %j',
    async (metadata) => {
      const data = topology({
        type: 'GeometryCollection',
        geometries: [{ type: 'Point', coordinates: [0, 0], ...metadata }],
      });
      const url = 'https://8.8.8.8/round5-topology-metadata.json';
      vi.stubGlobal(
        'fetch',
        async () =>
          new Response(JSON.stringify(data), {
            headers: { 'content-type': 'application/json' },
          }),
      );
      await expect(fetchGeographiesCache(url)).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        geography: url,
      });
    },
  );

  it('preserves absent, null, and object properties and scalar ids', () => {
    const data: Topology = {
      type: 'Topology',
      objects: {
        land: {
          type: 'GeometryCollection',
          properties: null,
          geometries: [
            { type: 'Point', coordinates: [0, 0] },
            {
              type: 'Point',
              coordinates: [1, 1],
              properties: null,
              id: 'country',
            },
            {
              type: 'Point',
              coordinates: [2, 2],
              properties: { name: 'Country' },
              id: 0,
            },
            { type: null, properties: {} },
          ],
        },
      },
      arcs: [],
    };
    expect(isTopology(data)).toBe(true);
    expect(getFeatures(data).map((feature) => feature.id)).toEqual([
      undefined,
      'country',
      0,
    ]);
  });

  it('preserves GeoJSON geometry foreign metadata members', () => {
    expect(
      isValidGeometry({
        type: 'Point',
        coordinates: [0, 0],
        properties: 'foreign',
        id: {},
      }),
    ).toBe(true);
    expect(
      isValidGeometry({
        type: 'GeometryCollection',
        geometries: [],
        properties: 'foreign',
        id: {},
      }),
    ).toBe(true);
  });
});
