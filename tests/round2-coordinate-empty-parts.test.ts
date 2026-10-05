import { describe, expect, it } from 'vitest';
import type { Feature, Geometry } from 'geojson';
import { getGeographyCoordinates } from '../src/index';
import { isFeature } from '../src/utils';

const geometries: Geometry[] = [
  {
    type: 'MultiLineString',
    coordinates: [
      [],
      [
        [10, 5],
        [20, 5],
      ],
    ],
  },
  {
    type: 'MultiPolygon',
    coordinates: [
      [],
      [
        [
          [10, 5],
          [10, 6],
          [11, 6],
          [10, 5],
        ],
      ],
    ],
  },
];

describe('coordinates after empty multipart geometry members', () => {
  it.each(geometries)(
    'finds the first available coordinate in $type',
    (geometry) => {
      const geography: Feature<Geometry> = {
        type: 'Feature',
        properties: {},
        geometry,
      };
      expect(isFeature(geography)).toBe(true);
      expect(getGeographyCoordinates(geography)).toEqual([10, 5]);
    },
  );

  it.each(geometries)('finds coordinates in a nested $type', (geometry) => {
    const geography: Feature<Geometry> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'GeometryCollection',
        geometries: [{ type: 'GeometryCollection', geometries: [geometry] }],
      },
    };
    expect(isFeature(geography)).toBe(true);
    expect(getGeographyCoordinates(geography)).toEqual([10, 5]);
  });

  it.each<Geometry>([
    { type: 'MultiLineString', coordinates: [[], []] },
    { type: 'MultiPolygon', coordinates: [[], []] },
  ])('returns null when every member of $type is empty', (geometry) => {
    expect(
      getGeographyCoordinates({ type: 'Feature', properties: {}, geometry }),
    ).toBeNull();
  });

  it.each<Geometry>([
    {
      type: 'MultiLineString',
      coordinates: [
        [
          [500, 5],
          [20, 5],
        ],
        [
          [10, 5],
          [20, 5],
        ],
      ],
    },
    {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [500, 5],
            [10, 6],
            [11, 6],
            [500, 5],
          ],
        ],
        [
          [
            [10, 5],
            [10, 6],
            [11, 6],
            [10, 5],
          ],
        ],
      ],
    },
  ])('preserves invalid leading coordinates handling for $type', (geometry) => {
    expect(
      getGeographyCoordinates({ type: 'Feature', properties: {}, geometry }),
    ).toBeNull();
  });
});
