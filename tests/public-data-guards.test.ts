import { geoAlbersUsa, geoMercator, geoPath, geoProjection } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import {
  getFeatures,
  isFeature,
  isFeatureCollection,
  isGeoProjection,
  isTopology,
  isValidGeographyData,
  isValidGeometry,
  prepareFeatures,
} from '../src/utils';

const path = geoPath(geoMercator());

// A consumer must be able to use unknown data after a public type guard succeeds.
function renderGeometry(value: unknown) {
  return isValidGeometry(value) ? path(value) : null;
}

function renderFeature(value: unknown) {
  return isFeature(value) ? path(value.geometry) : null;
}

function prepareData(value: unknown) {
  return isValidGeographyData(value)
    ? prepareFeatures(getFeatures(value), path)
    : [];
}

describe('public geography type guards', () => {
  it.each([
    { type: 'Point' },
    { type: 'LineString', coordinates: [null] },
    { type: 'GeometryCollection', geometries: [null] },
  ])('rejects malformed $type before rendering', (value) => {
    expect(() => renderGeometry(value)).not.toThrow();
    expect(isValidGeometry(value)).toBe(false);
  });

  it.each([
    { type: 'Feature', geometry: null, properties: {} },
    { type: 'Feature', geometry: { type: 'Point' }, properties: {} },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: 42,
    },
  ])('rejects features that cannot satisfy Feature<Geometry>', (value) => {
    expect(() => renderFeature(value)).not.toThrow();
    expect(isFeature(value)).toBe(false);
  });

  it('rejects malformed collection entries before feature preparation', () => {
    const value = { type: 'FeatureCollection', features: [null] };
    expect(() => prepareData(value)).not.toThrow();
    expect(isFeatureCollection(value)).toBe(false);
  });

  it.each([
    { type: 'Topology', objects: [], arcs: [] },
    {
      type: 'Topology',
      objects: { land: { type: 'Polygon', arcs: [[0]] } },
      arcs: [null],
    },
    {
      type: 'Topology',
      objects: { land: { type: 'Polygon', arcs: [[0]] } },
      arcs: [],
    },
  ])('rejects malformed topology before feature preparation', (value) => {
    expect(() => prepareData(value)).not.toThrow();
    expect(isTopology(value)).toBe(false);
  });

  it.each([
    {
      type: 'Topology',
      objects: { line: { type: 'LineString', arcs: [] } },
      arcs: [],
    },
    {
      type: 'Topology',
      objects: { land: { type: 'Polygon', arcs: [[0]] } },
      arcs: [[]],
    },
    {
      type: 'Topology',
      objects: { land: { type: 'Polygon', arcs: [[]] } },
      arcs: [],
    },
  ])('rejects arc sequences that produce undefined coordinates', (value) => {
    expect(() => prepareData(value)).not.toThrow();
    expect(isTopology(value)).toBe(false);
  });

  it('rejects cyclic geometry collections without overflowing', () => {
    const value = { type: 'GeometryCollection', geometries: [] as unknown[] };
    value.geometries.push(value);
    expect(isValidGeometry(value)).toBe(false);
  });

  it('accepts deeply nested acyclic collections without overflowing', () => {
    let geometry: unknown = { type: 'Point', coordinates: [0, 0] };
    for (let index = 0; index < 10000; index += 1) {
      geometry = { type: 'GeometryCollection', geometries: [geometry] };
    }
    expect(() => isValidGeometry(geometry)).not.toThrow();
    expect(isValidGeometry(geometry)).toBe(true);
    expect(
      isTopology({ type: 'Topology', objects: { land: geometry }, arcs: [] }),
    ).toBe(true);
  });

  it('accepts shared acyclic geometry references', () => {
    const shared = {
      type: 'GeometryCollection',
      geometries: [{ type: 'Point', coordinates: [0, 0] }],
    };
    const geometry = {
      type: 'GeometryCollection',
      geometries: [shared, shared],
    };
    expect(isValidGeometry(geometry)).toBe(true);
    expect(() => renderGeometry(geometry)).not.toThrow();
  });

  it('rejects sparse coordinate arrays before rendering', () => {
    const value = { type: 'LineString', coordinates: new Array(2) };
    expect(() => renderGeometry(value)).not.toThrow();
    expect(isValidGeometry(value)).toBe(false);
  });

  it('preserves valid altitude coordinates, empty geometries and topology', () => {
    expect(isValidGeometry({ type: 'Point', coordinates: [0, 0, 100] })).toBe(
      true,
    );
    expect(isValidGeometry({ type: 'Polygon', coordinates: [] })).toBe(true);
    expect(
      isValidGeometry({ type: 'GeometryCollection', geometries: [] }),
    ).toBe(true);
    expect(
      isFeatureCollection({ type: 'FeatureCollection', features: [] }),
    ).toBe(true);
    const value = {
      type: 'Topology',
      objects: {
        land: { type: 'Polygon', arcs: [[0, -1]] },
        absent: { type: null },
      },
      arcs: [
        [
          [0, 0],
          [10, 0],
          [0, 10],
        ],
      ],
      transform: { scale: [1, 1], translate: [0, 0] },
    };
    expect(isTopology(value)).toBe(true);
    expect(() => prepareData(value)).not.toThrow();
  });
});

describe('public projection type guard', () => {
  it('rejects an invert-only function before it reaches geoPath', () => {
    const value: unknown = Object.assign(() => [0, 0], {
      invert: () => [0, 0],
    });
    expect(() => {
      if (isGeoProjection(value)) {
        geoPath(value)({ type: 'Point', coordinates: [0, 0] });
      }
    }).not.toThrow();
    expect(isGeoProjection(value)).toBe(false);
  });

  it('accepts d3 projections even when invert is unavailable', () => {
    const withoutInvert = geoProjection((lambda, phi) => [lambda, phi]);
    expect(withoutInvert.invert).toBeUndefined();
    expect(isGeoProjection(withoutInvert)).toBe(true);
    expect(isGeoProjection(geoMercator())).toBe(true);
    expect(isGeoProjection(geoAlbersUsa())).toBe(true);
  });
});
