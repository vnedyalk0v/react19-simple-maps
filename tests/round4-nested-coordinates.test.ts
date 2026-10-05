import type { Feature, Geometry, GeometryCollection } from 'geojson';
import { describe, expect, it } from 'vitest';
import { getGeographyCoordinates } from '../src';

const feature = (geometry: Geometry): Feature<Geometry> => ({
  type: 'Feature',
  properties: {},
  geometry,
});

function nestedPoint(depth: number): Feature<Geometry> {
  let geometry: Geometry = { type: 'Point', coordinates: [12, 34] };
  for (let index = 0; index < depth; index += 1) {
    geometry = { type: 'GeometryCollection', geometries: [geometry] };
  }
  return feature(geometry);
}

describe('coordinates from nested geometry collections', () => {
  it.each([0, 1, 11])('finds the coordinate at depth %i', (depth) => {
    expect(getGeographyCoordinates(nestedPoint(depth))).toEqual([12, 34]);
  });

  it('preserves depth-first order across collection siblings', () => {
    expect(
      getGeographyCoordinates(
        feature({
          type: 'GeometryCollection',
          geometries: [
            nestedPoint(11).geometry,
            { type: 'Point', coordinates: [56, 78] },
          ],
        }),
      ),
    ).toEqual([12, 34]);
  });

  it('searches past empty nested collection members', () => {
    expect(
      getGeographyCoordinates(
        feature({
          type: 'GeometryCollection',
          geometries: [
            { type: 'GeometryCollection', geometries: [] },
            { type: 'MultiLineString', coordinates: [] },
            nestedPoint(11).geometry,
          ],
        }),
      ),
    ).toEqual([12, 34]);
  });

  it('terminates on malformed cyclic in-memory input and searches later members', () => {
    const cyclic: GeometryCollection = {
      type: 'GeometryCollection',
      geometries: [],
    };
    cyclic.geometries.push(cyclic);
    expect(getGeographyCoordinates(feature(cyclic))).toBeNull();
    cyclic.geometries.push(nestedPoint(11).geometry);
    expect(getGeographyCoordinates(feature(cyclic))).toEqual([12, 34]);
  });

  it('preserves the first nonempty multipart member behavior', () => {
    expect(
      getGeographyCoordinates(
        feature({
          type: 'MultiLineString',
          coordinates: [[], [[181, 0]], [[12, 34]]],
        }),
      ),
    ).toBeNull();
  });
});
