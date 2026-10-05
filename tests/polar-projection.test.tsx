import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ComposableMap,
  Marker,
  Annotation,
  Line,
  createCoordinates,
} from '../src';

describe('unprojectable valid coordinates', () => {
  it.each(['marker', 'annotation'])(
    'omits %s at the Mercator south pole',
    (kind) => {
      const coordinates = createCoordinates(0, -90);
      const html = renderToString(
        <ComposableMap projection="geoMercator">
          {kind === 'marker' ? (
            <Marker coordinates={coordinates}>
              <circle r={3} />
            </Marker>
          ) : (
            <Annotation subject={coordinates}>
              <text>pole</text>
            </Annotation>
          )}
        </ComposableMap>,
      );
      expect(html).not.toMatch(/Infinity|NaN/);
      expect(html).not.toContain(
        kind === 'marker' ? 'rsm-marker' : 'rsm-annotation',
      );
    },
  );
  it.each(['marker', 'annotation'])(
    'renders %s for a finite projection result',
    (kind) => {
      const coordinates = createCoordinates(0, 0);
      const html = renderToString(
        <ComposableMap projection="geoMercator">
          {kind === 'marker' ? (
            <Marker coordinates={coordinates}>
              <circle r={3} />
            </Marker>
          ) : (
            <Annotation subject={coordinates}>
              <text>equator</text>
            </Annotation>
          )}
        </ComposableMap>,
      );
      expect(html).toContain(
        kind === 'marker' ? 'rsm-marker' : 'rsm-annotation',
      );
      expect(html).not.toMatch(/Infinity|NaN/);
    },
  );
  it('keeps the clipped Line SVG finite', () => {
    const html = renderToString(
      <ComposableMap projection="geoMercator">
        <Line from={createCoordinates(0, -90)} to={createCoordinates(0, 0)} />
      </ComposableMap>,
    );
    expect(html).not.toMatch(/Infinity|NaN/);
    expect(html).toContain('rsm-line');
  });
});
