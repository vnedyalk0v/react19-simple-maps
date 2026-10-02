import { describe, expectTypeOf, it } from 'vitest';
import {
  ComposableMap,
  Geographies,
  Line,
  MapWithMetadata,
  createCoordinates,
  createRotationAngles,
  type MapWithMetadataProps,
  type ProjectionConfig,
  type RotationAngles,
} from '../src/index';

describe('public API types', () => {
  it('types Geographies render-prop features with rsmKey and svgPath', () => {
    <Geographies geography={{ type: 'FeatureCollection', features: [] }}>
      {({ geographies }) =>
        geographies.map((geo) => {
          expectTypeOf(geo.rsmKey).toEqualTypeOf<string>();
          expectTypeOf(geo.svgPath).toEqualTypeOf<string>();
          return <path key={geo.rsmKey} d={geo.svgPath} />;
        })
      }
    </Geographies>;
  });

  it('accepts createRotationAngles in projectionConfig.rotate', () => {
    expectTypeOf(
      createRotationAngles(-10, -20, 0),
    ).toEqualTypeOf<RotationAngles>();
    expectTypeOf<RotationAngles>().toExtend<
      NonNullable<ProjectionConfig['rotate']>
    >();
    <ComposableMap
      projection="geoOrthographic"
      projectionConfig={{ rotate: createRotationAngles(-10, -20, 0) }}
    />;
  });

  it('allows Line with only coordinates', () => {
    <Line coordinates={[createCoordinates(0, 0), createCoordinates(10, 10)]} />;
    <Line from={createCoordinates(0, 0)} to={createCoordinates(10, 10)} />;
  });

  it('accepts partial MapWithMetadata metadata', () => {
    expectTypeOf<{ title: string }>().toExtend<
      MapWithMetadataProps['metadata']
    >();
    <MapWithMetadata metadata={{ title: 'x' }} />;
  });
});
