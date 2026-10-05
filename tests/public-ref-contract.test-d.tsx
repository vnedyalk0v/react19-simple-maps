import { describe, expectTypeOf, it } from 'vitest';
import {
  Annotation,
  Geography,
  Geographies,
  Graticule,
  Line,
  Marker,
  Sphere,
  ZoomableGroup,
  createCoordinates,
  type AnnotationProps,
  type GeographyProps,
  type GeographiesProps,
  type GraticuleProps,
  type LineProps,
  type MarkerProps,
  type SphereProps,
  type SimpleZoomableGroupProps,
} from '../src/index';
const point = createCoordinates(2, 48);
interface LabeledLineProps extends LineProps {
  label: string;
}
const annotation: AnnotationProps = { subject: point };
const geography: GeographyProps = {
  geography: {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [2, 48] },
  },
};
const geographies: GeographiesProps = {
  geography: { type: 'FeatureCollection', features: [] },
  children: () => null,
};
const graticule: GraticuleProps = {};
const line: LabeledLineProps = { from: point, to: point, label: 'route' };
const marker: MarkerProps = { coordinates: point };
const sphere: SphereProps = {};
const zoom: SimpleZoomableGroupProps = {};
describe('public SVG ref contracts', () => {
  it('accepts objects typed with every exported SVG props interface', () => {
    const elements = [
      <Annotation {...annotation} />,
      <Geography {...geography} />,
      <Geographies {...geographies} />,
      <Graticule {...graticule} />,
      <Line {...line} />,
      <Marker {...marker} />,
      <Sphere {...sphere} />,
      <ZoomableGroup {...zoom} />,
    ];
    expectTypeOf(elements).items.toExtend<React.ReactElement>();
  });

  it('accepts explicit undefined refs allowed by React SVGProps', () => {
    const elements = [
      <Annotation subject={point} ref={undefined} />,
      <Geography geography={geography.geography} ref={undefined} />,
      <Geographies geography={geographies.geography} ref={undefined}>
        {geographies.children}
      </Geographies>,
      <Graticule ref={undefined} />,
      <Line from={point} to={point} ref={undefined} />,
      <Marker coordinates={point} ref={undefined} />,
      <Sphere ref={undefined} />,
      <ZoomableGroup ref={undefined} />,
    ];
    expectTypeOf(elements).items.toExtend<React.ReactElement>();
  });
});
