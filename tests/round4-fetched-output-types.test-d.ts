import { describe, expectTypeOf, it } from 'vitest';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import {
  fetchGeographies,
  fetchGeographiesCache,
  getFeatures,
  getMesh,
} from '../src/utils';

describe('fetched geography output types', () => {
  it('declares nullable raw GeoJSON for both fetch APIs', () => {
    expectTypeOf<
      Awaited<ReturnType<typeof fetchGeographiesCache>>
    >().toEqualTypeOf<Topology | FeatureCollection<Geometry | null>>();
    expectTypeOf<Awaited<ReturnType<typeof fetchGeographies>>>().toEqualTypeOf<
      Topology | FeatureCollection<Geometry | null> | undefined
    >();
  });

  it('requires raw geometry narrowing and keeps parser features non-null', () => {
    function inspect(data: Awaited<ReturnType<typeof fetchGeographiesCache>>) {
      if (data.type === 'FeatureCollection') {
        data.features.map((feature) => {
          // @ts-expect-error fetched GeoJSON preserves null geometries
          const unsafeType = feature.geometry.type;
          expectTypeOf(feature.geometry).toEqualTypeOf<Geometry | null>();
          if (feature.geometry !== null) {
            expectTypeOf(feature.geometry).toEqualTypeOf<Geometry>();
          }
          return unsafeType;
        });
      }
      expectTypeOf(
        getFeatures(data, (features) => {
          expectTypeOf(features).toEqualTypeOf<Feature<Geometry>[]>();
          return features.filter(
            (feature) => feature.geometry.type === 'Point',
          );
        }),
      ).toEqualTypeOf<Feature<Geometry>[]>();
      getMesh(data);
    }
    expectTypeOf(inspect).toBeFunction();
  });
});
