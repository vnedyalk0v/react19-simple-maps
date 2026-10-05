import { describe, expectTypeOf, it } from 'vitest';
import { createRef, type ReactElement } from 'react';
import {
  ComposableMap,
  Geographies,
  Line,
  MapWithMetadata,
  createCoordinates,
  createRotationAngles,
  type LineProps,
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

  it('returns a JSX-compatible element from MapWithMetadata', () => {
    expectTypeOf<ReturnType<typeof MapWithMetadata>>().toExtend<ReactElement>();
  });

  it('types presetArgs for the selected MapWithMetadata preset', () => {
    const metadata = {
      title: 't',
      description: 'd',
      keywords: [],
      author: '',
      canonicalUrl: '',
    };
    <MapWithMetadata metadata={metadata} />;
    <MapWithMetadata
      metadata={metadata}
      preset="countryMap"
      presetArgs={['France']}
    />;
    <MapWithMetadata
      metadata={metadata}
      preset="cityMap"
      presetArgs={['Paris']}
    />;
    <MapWithMetadata
      metadata={metadata}
      preset="cityMap"
      presetArgs={['Paris', 'France']}
    />;
    <MapWithMetadata metadata={metadata} ref={createRef<SVGSVGElement>()} />;
    // @ts-expect-error worldMap takes no arguments
    <MapWithMetadata metadata={metadata} presetArgs={['France']} />;
    const invalidArgs = () => [
      MapWithMetadata({
        metadata,
        preset: 'countryMap',
        // @ts-expect-error countryMap takes a country name
        presetArgs: [1],
      }),
      MapWithMetadata({
        metadata,
        preset: 'dataVisualization',
        // @ts-expect-error dataVisualization takes one argument
        presetArgs: ['a', 'b'],
      }),
    ];
    expectTypeOf(invalidArgs).toBeFunction();

    const props: MapWithMetadataProps = { metadata, preset: 'countryMap' };
    <MapWithMetadata {...props} />;
  });

  it('keeps MapWithMetadataProps an extendable interface', () => {
    interface BrandedMapProps extends MapWithMetadataProps {
      brand: string;
    }
    expectTypeOf<BrandedMapProps['preset']>().toEqualTypeOf<
      MapWithMetadataProps['preset']
    >();
  });
});
