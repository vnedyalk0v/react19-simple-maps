import { StrictMode, act } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { geoProjection } from 'd3-geo';
import { zoomTransform } from 'd3-zoom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComposableMap, ZoomableGroup, type Position } from '../src';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Cylindrical equal-area has a finite vertical domain. Its inverse is
// undefined outside that domain even when a pan transform is finite.
function cylindricalEqualArea() {
  const raw = Object.assign(
    (longitude: number, latitude: number): [number, number] => [
      longitude,
      Math.sin(latitude),
    ],
    {
      invert: (x: number, y: number): [number, number] => [x, Math.asin(y)],
    },
  );
  return geoProjection(raw).scale(100).translate([400, 300]);
}

function mouse(target: Element | Window, type: string, y: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 100,
    clientY: y,
  });
  Object.defineProperty(event, 'view', { value: window });
  fireEvent(target, event);
}

function finishDrag(y: number) {
  mouse(window, 'mouseup', y);
  act(() => vi.runOnlyPendingTimers());
}

describe('zoom callbacks outside a projection inverse domain', () => {
  it('omits invalid positions and resumes callbacks when the center reenters the domain', () => {
    vi.useFakeTimers();
    const starts: Position[] = [];
    const moves: Position[] = [];
    const ends: Position[] = [];
    const view = render(
      <StrictMode>
        <ComposableMap projection={cylindricalEqualArea()}>
          <ZoomableGroup
            onMoveStart={(position) => starts.push(position)}
            onMove={(position) => moves.push(position)}
            onMoveEnd={(position) => ends.push(position)}
          />
        </ComposableMap>
      </StrictMode>,
    );
    const group = view.container.querySelector('.rsm-zoomable-group');
    const target = group?.parentElement;
    if (!group || !target) throw new Error('Missing zoom target');

    mouse(target, 'mousedown', 100);
    mouse(window, 'mousemove', 500);
    finishDrag(500);
    expect(starts).toHaveLength(1);
    expect(moves).toHaveLength(0);
    expect(ends).toHaveLength(0);
    expect(group.getAttribute('transform')).not.toMatch(/NaN|Infinity/);
    expect(zoomTransform(target).y).toBeCloseTo(400);

    // A second drag starts outside the domain, then brings the center back.
    mouse(target, 'mousedown', 500);
    expect(starts).toHaveLength(1);
    mouse(window, 'mousemove', 100);
    finishDrag(100);
    expect(moves).toHaveLength(1);
    expect(ends).toHaveLength(1);
    expect(moves[0]?.coordinates).toEqual([0, 0]);
    expect(ends[0]?.coordinates).toEqual([0, 0]);
    expect(zoomTransform(target).y).toBeCloseTo(0);

    mouse(target, 'mousedown', 100);
    finishDrag(100);
    expect(starts).toHaveLength(2);
    expect(ends).toHaveLength(2);
    expect(
      [...starts, ...moves, ...ends].every((position) =>
        position.coordinates.every(Number.isFinite),
      ),
    ).toBe(true);
  });
});
