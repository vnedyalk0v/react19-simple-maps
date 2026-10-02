import { describe, expectTypeOf, it } from 'vitest';
import {
  ComposableMap,
  Geographies,
  Line,
  createCoordinates,
  createRotationAngles,
  type LineProps,
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

  it('requires either coordinates or both from and to on Line', () => {
    <Line coordinates={[createCoordinates(0, 0), createCoordinates(10, 10)]} />;
    <Line from={createCoordinates(0, 0)} to={createCoordinates(10, 10)} />;
    // @ts-expect-error a line needs coordinates or both endpoints
    <Line />;
    // @ts-expect-error a single endpoint is not a line
    <Line from={createCoordinates(0, 0)} />;
  });

  it('keeps LineProps an extendable interface', () => {
    interface LabeledLineProps extends LineProps {
      label: string;
    }
    expectTypeOf<LabeledLineProps['from']>().toEqualTypeOf<LineProps['from']>();
  });
});
