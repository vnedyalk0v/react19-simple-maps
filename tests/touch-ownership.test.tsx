import { StrictMode } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoomTransform } from 'd3-zoom';
import ComposableMap from '../src/components/ComposableMap';
import ZoomableGroup from '../src/components/ZoomableGroup';

afterEach(cleanup);

const finger = (identifier: number, target: Element, clientX: number) =>
  ({ identifier, target, clientX, clientY: 100 }) as Touch;

function touch(
  target: Element,
  type: string,
  touches: Touch[],
  changedTouches = touches,
) {
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches,
    targetTouches: touches.filter((item) => item.target === target),
    changedTouches,
  });
  fireEvent(target, event);
  return event;
}

const zoomTarget = (view: ReturnType<typeof render>) =>
  view.container.querySelector('.rsm-zoomable-group')!.parentElement!;

const rejectSecondFinger = (event: Event) =>
  event.type !== 'touchstart' ||
  (event as TouchEvent).changedTouches[0]!.identifier !== 2;

describe('accepted map touch ownership', () => {
  it.each([true, false])(
    'pans with one owned finger while another finger is outside (enableZoom=%s)',
    (enableZoom) => {
      const move = vi.fn();
      const end = vi.fn();
      const view = render(
        <StrictMode>
          <div data-testid="outside" />
          <ComposableMap>
            <ZoomableGroup
              zoom={2}
              enableZoom={enableZoom}
              onMove={move}
              onMoveEnd={end}
            />
          </ComposableMap>
        </StrictMode>,
      );
      const map = zoomTarget(view);
      const outside = view.getByTestId('outside');
      const a = finger(1, outside, 1000);
      const b = finger(2, map, 100);
      const before = zoomTransform(map);
      touch(outside, 'touchstart', [a], [a]);
      touch(map, 'touchstart', [a, b], [b]);
      const moved = finger(2, map, 200);
      const moveEvent = touch(map, 'touchmove', [a, moved], [moved]);
      expect(zoomTransform(map).k).toBe(2);
      expect(zoomTransform(map).x - before.x).toBeCloseTo(100);
      expect(move).toHaveBeenCalledTimes(1);
      expect(move.mock.calls[0]![1]).toBe(moveEvent);
      const endEvent = touch(map, 'touchend', [a], [moved]);
      expect(end).toHaveBeenCalledTimes(1);
      expect(end.mock.calls[0]![1]).toBe(endEvent);
    },
  );

  it.each([true, false])(
    'does not consume rejected finger events while another finger is accepted (enablePan=%s)',
    (enablePan) => {
      const move = vi.fn();
      const end = vi.fn();
      const view = render(
        <ComposableMap>
          <ZoomableGroup
            zoom={2}
            enablePan={enablePan}
            onMove={move}
            onMoveEnd={end}
            filterZoomEvent={rejectSecondFinger}
          />
        </ComposableMap>,
      );
      const map = zoomTarget(view);
      const a = finger(1, map, 100);
      const b = finger(2, map, 200);
      touch(map, 'touchstart', [a], [a]);
      touch(map, 'touchstart', [a, b], [b]);
      const moved = finger(2, map, 250);
      expect(
        touch(map, 'touchmove', [a, moved], [moved]).defaultPrevented,
      ).toBe(false);
      expect(touch(map, 'touchcancel', [a], [moved]).cancelBubble).toBe(false);
      expect(move).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
      touch(map, 'touchend', [], [a]);
      expect(end).toHaveBeenCalledTimes(enablePan ? 1 : 0);
    },
  );

  it.each([true, false])(
    'pinches with two accepted fingers when an intervening finger was rejected (enablePan=%s)',
    (enablePan) => {
      const view = render(
        <ComposableMap>
          <ZoomableGroup
            zoom={2}
            enablePan={enablePan}
            filterZoomEvent={rejectSecondFinger}
          />
        </ComposableMap>,
      );
      const map = zoomTarget(view);
      const a = finger(1, map, 100);
      const b = finger(2, map, 200);
      const c = finger(3, map, 300);
      touch(map, 'touchstart', [a], [a]);
      touch(map, 'touchstart', [a, b], [b]);
      touch(map, 'touchstart', [a, b, c], [c]);
      const moved = finger(3, map, 400);
      touch(map, 'touchmove', [a, b, moved], [moved]);
      expect(zoomTransform(map).k).toBeCloseTo(3);
      touch(map, 'touchend', [b], [a, moved]);
    },
  );

  it('lets two maps independently pan and end their simultaneous touches', () => {
    const firstEnd = vi.fn();
    const secondEnd = vi.fn();
    const view = render(
      <>
        <ComposableMap>
          <ZoomableGroup zoom={2} onMoveEnd={firstEnd} />
        </ComposableMap>
        <ComposableMap>
          <ZoomableGroup zoom={2} onMoveEnd={secondEnd} />
        </ComposableMap>
      </>,
    );
    const [first, second] = Array.from(
      view.container.querySelectorAll('.rsm-zoomable-group'),
      (element) => element.parentElement!,
    );
    const a = finger(1, first!, 100);
    const b = finger(2, second!, 1000);
    touch(first!, 'touchstart', [a], [a]);
    touch(second!, 'touchstart', [a, b], [b]);
    const moved = finger(2, second!, 1100);
    touch(second!, 'touchmove', [a, moved], [moved]);
    expect(zoomTransform(second!).k).toBe(2);
    touch(second!, 'touchend', [a], [moved]);
    expect(secondEnd).toHaveBeenCalledTimes(1);
    expect(firstEnd).not.toHaveBeenCalled();
    const firstMoved = finger(1, first!, 150);
    touch(first!, 'touchmove', [firstMoved], [firstMoved]);
    expect(zoomTransform(first!).k).toBe(2);
    touch(first!, 'touchend', [], [firstMoved]);
    expect(firstEnd).toHaveBeenCalledTimes(1);
  });
});

it('does not call onMove after a deferred pinch start synchronously unmounts its map', () => {
  const move = vi.fn();
  const view = render(
    <ComposableMap>
      <ZoomableGroup
        enablePan={false}
        onMoveStart={() => view.unmount()}
        onMove={move}
      />
    </ComposableMap>,
  );
  const map = zoomTarget(view);
  const a = finger(1, map, 100);
  const b = finger(2, map, 200);
  touch(map, 'touchstart', [a], [a]);
  touch(map, 'touchstart', [a, b], [b]);
  touch(map, 'touchmove', [finger(1, map, 50), finger(2, map, 250)]);
  expect(move).not.toHaveBeenCalled();
});
