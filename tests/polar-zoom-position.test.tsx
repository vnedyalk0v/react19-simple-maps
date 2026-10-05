import { StrictMode, act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { zoomTransform } from 'd3-zoom';
import { geoAlbersUsa, geoMercator } from 'd3-geo';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComposableMap, ZoomableGroup, createCoordinates } from '../src';
afterEach(cleanup);
const polar = createCoordinates(0, -90);
const valid = createCoordinates(20, 10);
function elements(container: HTMLElement) {
  const group = container.querySelector('.rsm-zoomable-group')!;
  const outer = group.parentElement as unknown as SVGGElement;
  return { group, outer };
}
function assertFiniteGesture(container: HTMLElement) {
  const { group, outer } = elements(container);
  const before = zoomTransform(outer);
  expect([before.x, before.y, before.k].every(Number.isFinite)).toBe(true);
  fireEvent.wheel(outer, { deltaY: -100, clientX: 100, clientY: 100 });
  const after = zoomTransform(outer);
  expect(after.k).toBeGreaterThan(before.k);
  expect([after.x, after.y, after.k].every(Number.isFinite)).toBe(true);
  expect(group.getAttribute('transform')).not.toMatch(/Infinity|NaN/);
}
describe('unprojectable polar zoom centers', () => {
  it('uses identity in server markup for a nonfinite projection', () => {
    const html = renderToString(
      <ComposableMap projection="geoMercator">
        <ZoomableGroup center={polar} zoom={2} />
      </ComposableMap>,
    );
    expect(html).toContain('transform="translate(0 0) scale(1)"');
    expect(html).not.toMatch(/Infinity|NaN/);
  });
  it('hydrates identity and keeps finite gestures', async () => {
    const ui = (
      <StrictMode>
        <ComposableMap projection="geoMercator">
          <ZoomableGroup center={polar} zoom={2} />
        </ComposableMap>
      </StrictMode>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(ui);
    const onRecoverableError = vi.fn();
    const root = hydrateRoot(container, ui, { onRecoverableError });
    try {
      await act(async () => {});
      expect(elements(container).group.getAttribute('transform')).toBe(
        'translate(0 0) scale(1)',
      );
      expect(zoomTransform(elements(container).outer)).toMatchObject({
        x: 0,
        y: 0,
        k: 1,
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      assertFiniteGesture(container);
    } finally {
      act(() => root.unmount());
    }
  });
  it.each([
    {
      result: 'nonfinite',
      projection: geoMercator().translate([400, 300]),
      initial: valid,
      unprojectable: polar,
      next: createCoordinates(-15, 25),
    },
    {
      result: 'null',
      projection: geoAlbersUsa().translate([400, 300]),
      initial: createCoordinates(-100, 40),
      unprojectable: valid,
      next: createCoordinates(-110, 35),
    },
  ])(
    'preserves the current position for a $result result and resumes valid control and gestures',
    ({ projection, initial, unprojectable, next }) => {
      const ui = (center = initial, zoom = 2) => (
        <StrictMode>
          <ComposableMap projection={projection}>
            <ZoomableGroup center={center} zoom={zoom} />
          </ComposableMap>
        </StrictMode>
      );
      const view = render(ui());
      const { group, outer } = elements(view.container);
      const before = zoomTransform(outer);
      view.rerender(ui(unprojectable, 3));
      expect(zoomTransform(outer)).toMatchObject({
        x: before.x,
        y: before.y,
        k: before.k,
      });
      expect(group.getAttribute('transform')).not.toMatch(/Infinity|NaN/);
      assertFiniteGesture(view.container);
      view.rerender(ui(next, 3));
      const projected = projection(next)!;
      expect(zoomTransform(outer)).toMatchObject({
        x: 400 - projected[0] * 3,
        y: 300 - projected[1] * 3,
        k: 3,
      });
      assertFiniteGesture(view.container);
    },
  );
  it('recovers from an initially unprojectable center', () => {
    const projection = geoMercator().translate([400, 300]);
    const ui = (center = polar) => (
      <StrictMode>
        <ComposableMap projection={projection}>
          <ZoomableGroup center={center} zoom={2} />
        </ComposableMap>
      </StrictMode>
    );
    const view = render(ui());
    expect(elements(view.container).group.getAttribute('transform')).toBe(
      'translate(0 0) scale(1)',
    );
    view.rerender(ui(valid));
    const projected = projection(valid)!;
    expect(zoomTransform(elements(view.container).outer)).toMatchObject({
      x: 400 - projected[0] * 2,
      y: 300 - projected[1] * 2,
      k: 2,
    });
    assertFiniteGesture(view.container);
  });
});
