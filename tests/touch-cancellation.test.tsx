import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { zoomTransform } from 'd3-zoom';
import ComposableMap from '../src/components/ComposableMap';
import ZoomableGroup from '../src/components/ZoomableGroup';
import { createCoordinates } from '../src/types';

// D3 captures its animation clock on import, so install the test clock first.
vi.hoisted(() =>
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'Date',
      'performance',
    ],
  }),
);

afterEach(() => {
  cleanup();
  act(() => vi.advanceTimersByTime(1000));
  vi.restoreAllMocks();
});
afterAll(() => vi.useRealTimers());

function touch(
  target: Element,
  type: string,
  fingers: [number, number][] = [[1, 100]],
  changed: [number, number][] = fingers,
) {
  const makeFinger = ([identifier, clientX]: [number, number]) =>
    ({ identifier, target, clientX, clientY: 100 }) as Touch;
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: fingers.map(makeFinger),
    targetTouches: fingers.map(makeFinger),
    changedTouches: changed.map(makeFinger),
  });
  fireEvent(target, event);
  return event;
}

function map(enablePan: boolean, strict = false) {
  const move = vi.fn();
  const end = vi.fn();
  const content = (
    <ComposableMap>
      <ZoomableGroup
        enablePan={enablePan}
        center={createCoordinates(20, 10)}
        zoom={2}
        onMove={move}
        onMoveEnd={end}
        filterZoomEvent={() => true}
      />
    </ComposableMap>
  );
  const view = render(strict ? <StrictMode>{content}</StrictMode> : content);
  const target = view.container.querySelector(
    '.rsm-zoomable-group',
  )!.parentElement!;
  return { ...view, target, move, end };
}

function finish(target: Element, type = 'touchend') {
  touch(target, type, [], [[1, 100]]);
}

function completeDoubleTap(target: Element) {
  touch(target, 'touchstart');
  finish(target);
  touch(target, 'touchstart');
  finish(target);
  act(() => vi.advanceTimersByTime(350));
}

describe('touch cancellation', () => {
  it.each([true, false])(
    'cancels the second tap without moving and preserves the next double tap (enablePan=%s)',
    (enablePan) => {
      const { target, move } = map(enablePan);
      const before = zoomTransform(target);
      touch(target, 'touchstart');
      finish(target);
      touch(target, 'touchstart');
      finish(target, 'touchcancel');
      act(() => vi.advanceTimersByTime(350));
      expect(move).not.toHaveBeenCalled();
      expect(zoomTransform(target)).toEqual(before);
      completeDoubleTap(target);
      expect(zoomTransform(target).k).toBeCloseTo(4);
    },
  );

  it.each([
    [true, false],
    [false, false],
    [true, true],
    [false, true],
  ] as const)(
    'does not count a canceled first tap and recovers the next two valid taps (pan=%s, strict=%s)',
    (enablePan, strict) => {
      const { target, move } = map(enablePan, strict);
      const before = zoomTransform(target);
      touch(target, 'touchstart');
      finish(target, 'touchcancel');
      touch(target, 'touchstart');
      finish(target);
      act(() => vi.advanceTimersByTime(30));
      expect(move).not.toHaveBeenCalled();
      expect(zoomTransform(target)).toEqual(before);
      touch(target, 'touchstart');
      finish(target);
      act(() => vi.advanceTimersByTime(350));
      const after = zoomTransform(target);
      expect(after.k).toBeCloseTo(4);
      if (!enablePan) {
        expect((400 - after.x) / after.k).toBeCloseTo(
          (400 - before.x) / before.k,
        );
        expect((300 - after.y) / after.k).toBeCloseTo(
          (300 - before.y) / before.k,
        );
      }
    },
  );

  it.each([true, false])(
    'finishes a canceled pinch once and treats the next touch as a first tap (pan=%s)',
    (enablePan) => {
      const { target, move, end } = map(enablePan);
      touch(target, 'touchstart', [[1, 100]]);
      touch(
        target,
        'touchstart',
        [
          [1, 100],
          [2, 200],
        ],
        [[2, 200]],
      );
      touch(target, 'touchmove', [
        [1, 50],
        [2, 250],
      ]);
      const pinched = zoomTransform(target);
      expect(pinched.k).toBeCloseTo(4);
      touch(target, 'touchcancel', [[1, 50]], [[2, 250]]);
      expect(end).not.toHaveBeenCalled();
      touch(target, 'touchcancel', [], [[1, 50]]);
      expect(end).toHaveBeenCalledTimes(1);
      move.mockClear();
      touch(target, 'touchstart');
      finish(target);
      act(() => vi.advanceTimersByTime(350));
      expect(move).not.toHaveBeenCalled();
      expect(zoomTransform(target)).toEqual(pinched);
    },
  );

  it('cleans up a map removed immediately after cancellation', () => {
    const { target, move, end, unmount } = map(true, true);
    touch(target, 'touchstart');
    finish(target, 'touchcancel');
    const before = zoomTransform(target);
    move.mockClear();
    end.mockClear();
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(move).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
    expect(zoomTransform(target)).toEqual(before);
  });
  it.each(['touchend', 'touchcancel'])(
    'does not terminate a wheel gesture for a rejected touch ending with %s',
    (type) => {
      const end = vi.fn();
      const view = render(
        <ComposableMap>
          <ZoomableGroup
            filterZoomEvent={(event) => event.type === 'wheel'}
            onMoveEnd={end}
          />
        </ComposableMap>,
      );
      const target = view.container.querySelector(
        '.rsm-zoomable-group',
      )!.parentElement!;
      fireEvent.wheel(target, { deltaY: -100, clientX: 400, clientY: 300 });
      touch(target, 'touchstart');
      finish(target, type);
      expect(end).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(200));
      expect(end).toHaveBeenCalledTimes(1);
      expect(end.mock.calls[0]![1].type).toBe('wheel');
    },
  );
});
