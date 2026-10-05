import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Feature, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import {
  ComposableMap,
  Geography,
  createCoordinates,
  createParallels,
  createRotationAngles,
  getBestGeographyCoordinates,
  getGeographyBounds,
  getGeographyCentroid,
  getGeographyCoordinates,
  useMapContext,
  type ComposableMapProps,
} from '../src/index';
import type { GeoProjection } from 'd3-geo';
import { getFeatures } from '../src/utils/geography-processing';

const renderProjection = (props: ComposableMapProps): GeoProjection => {
  let projection: GeoProjection | undefined;
  function Probe() {
    projection = useMapContext().projection;
    return null;
  }
  renderToString(
    <ComposableMap {...props}>
      <Probe />
    </ComposableMap>,
  );
  return projection!;
};

const feature = (geometry: Geometry): Feature<Geometry> => ({
  type: 'Feature',
  properties: {},
  geometry,
});

describe('ComposableMap projection names', () => {
  it.each([
    'geoArea',
    'geoMercatorRaw',
    'geoGraticule',
    'geoCentroid',
    'geoTransform',
    'geoProjection',
  ])(
    'rejects non-projection d3-geo export %s with PROJECTION_ERROR',
    (name) => {
      expect(() => renderProjection({ projection: name })).toThrow(
        expect.objectContaining({
          type: 'PROJECTION_ERROR',
          message: `Unknown projection: ${name}`,
        }),
      );
    },
  );

  it.each([
    ['geoEqualEarth', {}],
    ['geoMercator', {}],
    ['geoAlbersUsa', {}],
    ['geoConicEqualArea', { parallels: createParallels(29.5, 45.5) }],
    ['geoOrthographic', {}],
  ])('still builds the real %s projection', (name, projectionConfig) => {
    const projection = renderProjection({ projection: name, projectionConfig });
    expect(projection.translate()).toEqual([400, 300]);
  });
});

describe('projectionConfig validation', () => {
  it('accepts scales above 10000 for city-level maps', () => {
    const projection = renderProjection({
      projection: 'geoMercator',
      projectionConfig: {
        scale: 50000,
        center: createCoordinates(-74, 40.7),
      },
    });
    expect(projection.scale()).toBe(50000);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, '100'])(
    'rejects invalid scale %s',
    (scale) => {
      expect(() =>
        renderProjection({
          projectionConfig: { scale: scale as number },
        }),
      ).toThrow();
    },
  );

  it('applies three-element rotation from createRotationAngles', () => {
    const projection = renderProjection({
      projection: 'geoOrthographic',
      projectionConfig: { rotate: createRotationAngles(-10, -20, 5) },
    });
    expect(projection.rotate()).toEqual([-10, -20, 5]);
  });

  it('applies the two-element [lambda, phi] rotation form', () => {
    const projection = renderProjection({
      projection: 'geoOrthographic',
      projectionConfig: {
        rotate: [-10, -20] as unknown as ReturnType<
          typeof createRotationAngles
        >,
      },
    });
    expect(projection.rotate()).toEqual([-10, -20, 0]);
  });
});

describe('geography utilities with empty or invalid geometries', () => {
  const emptyGeometries: Geometry[] = [
    { type: 'Polygon', coordinates: [] },
    { type: 'LineString', coordinates: [] },
  ];

  it.each(emptyGeometries)(
    'returns null bounds and centroid for empty $type',
    (geometry) => {
      expect(getGeographyBounds(feature(geometry))).toBeNull();
      expect(getGeographyCentroid(feature(geometry))).toBeNull();
    },
  );

  it.each(emptyGeometries)(
    'renders <Geography> with an empty $type without crashing',
    (geometry) => {
      const { container } = render(
        <ComposableMap>
          <Geography geography={feature(geometry)} />
        </ComposableMap>,
      );
      expect(container.querySelector('path.rsm-geography')).not.toBeNull();
    },
  );

  it('finds coordinates after empty members of a GeometryCollection', () => {
    const collection = feature({
      type: 'GeometryCollection',
      geometries: [
        { type: 'GeometryCollection', geometries: [] },
        { type: 'LineString', coordinates: [] },
        {
          type: 'GeometryCollection',
          geometries: [
            { type: 'Polygon', coordinates: [] },
            { type: 'Point', coordinates: [10, 5] },
          ],
        },
      ],
    });

    expect(getGeographyCoordinates(collection)).toEqual([10, 5]);
  });

  it('skips invalid coordinates in a GeometryCollection', () => {
    const collection = feature({
      type: 'GeometryCollection',
      geometries: [
        { type: 'Point', coordinates: [0, Number.NaN] },
        { type: 'Point', coordinates: [500, 5] },
        { type: 'Point', coordinates: [10, 5] },
      ],
    });

    expect(getGeographyCoordinates(collection)).toEqual([10, 5]);
  });

  it('returns null instead of out-of-range or non-finite coordinates', () => {
    const outOfRange = feature({ type: 'Point', coordinates: [500, 5] });
    const notFinite = feature({ type: 'Point', coordinates: [0, Number.NaN] });

    expect(getGeographyCoordinates(outOfRange)).toBeNull();
    expect(getGeographyCoordinates(notFinite)).toBeNull();
    expect(getBestGeographyCoordinates(notFinite)).toBeNull();
    expect(
      getGeographyCoordinates(feature({ type: 'Point', coordinates: [10, 5] })),
    ).toEqual([10, 5]);
  });
});

describe('getFeatures with TopoJSON', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ],
    ],
    objects: { land: { type: 'Polygon', arcs: [[0]] } },
  } as unknown as Topology;

  it('returns the feature when the first object is a single geometry', () => {
    const features = getFeatures(topology);
    expect(features).toHaveLength(1);
    expect(features[0]?.geometry.type).toBe('Polygon');
  });

  it('applies parseGeographies to the single feature', () => {
    const features = getFeatures(topology, (geos) =>
      geos.map((geo) => ({ ...geo, properties: { parsed: true } })),
    );
    expect(features).toEqual([
      expect.objectContaining({ properties: { parsed: true } }),
    ]);
  });
});
