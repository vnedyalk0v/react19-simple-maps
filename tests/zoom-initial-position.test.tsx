import { StrictMode, act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { zoomTransform } from 'd3-zoom';
import { cleanup, render } from '@testing-library/react';
import { geoAlbersUsa, geoMercator } from 'd3-geo';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ComposableMap,
  ZoomableGroup,
  createCoordinates,
  useZoomPanContext,
} from '../src';

afterEach(cleanup);

describe('ZoomableGroup initial positioning', () => {
  it('renders the requested center and zoom on the server', () => {
    const center = createCoordinates(20, 10);
    const projection = geoMercator().translate([400, 300]);
    const projected = projection(center)!;
    const expected = `translate(${400 - projected[0] * 2} ${300 - projected[1] * 2}) scale(2)`;
    const markup = renderToString(
      <ComposableMap projection={projection}>
        <ZoomableGroup center={center} zoom={2} />
      </ComposableMap>,
    );
    expect(markup).toContain(`transform="${expected}"`);
  });

  it('provides the requested initial position before client Effects run', () => {
    const projection = geoMercator().translate([400, 300]);
    const center = createCoordinates(20, 10);
    const projected = projection(center)!;
    const observed: { x: number; y: number; k: number }[] = [];
    function Probe() {
      const position = useZoomPanContext();
      observed.push({ x: position.x, y: position.y, k: position.k });
      return null;
    }
    render(
      <StrictMode>
        <ComposableMap projection={projection}>
          <ZoomableGroup center={center} zoom={2}>
            <Probe />
          </ZoomableGroup>
        </ComposableMap>
      </StrictMode>,
    );
    expect(observed[0]).toEqual({
      x: 400 - projected[0] * 2,
      y: 300 - projected[1] * 2,
      k: 2,
    });
  });
  it('hydrates the same position and initializes the matching gesture transform', async () => {
    const projection = geoMercator().translate([400, 300]);
    const center = createCoordinates(20, 10);
    const projected = projection(center)!;
    const ui = (
      <StrictMode>
        <ComposableMap projection={projection}>
          <ZoomableGroup center={center} zoom={2} />
        </ComposableMap>
      </StrictMode>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(ui);
    const initialTransform = container
      .querySelector('.rsm-zoomable-group')!
      .getAttribute('transform');
    const onRecoverableError = vi.fn();
    const root = hydrateRoot(container, ui, { onRecoverableError });
    try {
      await act(async () => {});
      const group = container.querySelector('.rsm-zoomable-group')!;
      expect(group.getAttribute('transform')).toBe(initialTransform);
      expect(
        zoomTransform(group.parentElement as unknown as SVGGElement),
      ).toMatchObject({
        x: 400 - projected[0] * 2,
        y: 300 - projected[1] * 2,
        k: 2,
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
    }
  });

  it('initializes a custom projection without an inverse', () => {
    const projection = geoMercator().translate([400, 300]);
    Reflect.deleteProperty(projection, 'invert');
    const center = createCoordinates(20, 10);
    const projected = projection(center)!;
    const expected = `translate(${400 - projected[0] * 2} ${300 - projected[1] * 2}) scale(2)`;
    const ui = (
      <ComposableMap projection={projection}>
        <ZoomableGroup center={center} zoom={2} />
      </ComposableMap>
    );
    expect(renderToString(ui)).toContain(`transform="${expected}"`);
    const view = render(ui);
    expect(
      view.container
        .querySelector('.rsm-zoomable-group')!
        .getAttribute('transform'),
    ).toBe(expected);
  });

  it('keeps the identity transform when the projection excludes the requested center', () => {
    const projection = geoAlbersUsa();
    const center = createCoordinates(20, 10);
    expect(projection(center)).toBeNull();
    const ui = (
      <ComposableMap projection={projection}>
        <ZoomableGroup center={center} zoom={2} />
      </ComposableMap>
    );
    expect(renderToString(ui)).toContain('transform="translate(0 0) scale(1)"');
    const view = render(ui);
    expect(
      view.container
        .querySelector('.rsm-zoomable-group')!
        .getAttribute('transform'),
    ).toBe('translate(0 0) scale(1)');
  });

  it('applies controlled position changes after initialization', () => {
    const projection = geoMercator().translate([400, 300]);
    const ui = (center = createCoordinates(20, 10), zoom = 2) => (
      <StrictMode>
        <ComposableMap projection={projection}>
          <ZoomableGroup center={center} zoom={zoom} />
        </ComposableMap>
      </StrictMode>
    );
    const view = render(ui());
    const center = createCoordinates(-15, 25);
    view.rerender(ui(center, 3));
    const projected = projection(center)!;
    const expected = `translate(${400 - projected[0] * 3} ${300 - projected[1] * 3}) scale(3)`;
    expect(
      view.container
        .querySelector('.rsm-zoomable-group')!
        .getAttribute('transform'),
    ).toBe(expected);
  });
});
