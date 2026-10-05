import { StrictMode, useState } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoomTransform } from 'd3-zoom';
import { flushSync } from 'react-dom';
import {
  ComposableMap,
  ZoomableGroup,
  createCoordinates,
  type Position,
} from '../src';

const originalUserSelect = Reflect.get(
  document.documentElement.style,
  'MozUserSelect',
);

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  if (originalUserSelect === undefined) {
    Reflect.deleteProperty(document.documentElement.style, 'MozUserSelect');
  } else {
    Reflect.set(
      document.documentElement.style,
      'MozUserSelect',
      originalUserSelect,
    );
  }
});

const zoomTarget = (view: ReturnType<typeof render>) =>
  view.container.querySelector('.rsm-zoomable-group')!
    .parentElement as unknown as SVGGElement;

function mouse(target: Element | Window, type: string, x = 400, button = 0) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: 300,
    button,
  });
  Object.defineProperty(event, 'view', { value: window });
  fireEvent(target, event);
  return event;
}

function wheel(target: Element) {
  fireEvent.wheel(target, { deltaY: -100, clientX: 400, clientY: 300 });
}

function touch(target: Element, type: string, x: number) {
  const finger = { identifier: 1, target, clientX: x, clientY: 300 };
  fireEvent(
    target,
    new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: type === 'touchend' ? [] : [finger as Touch],
      changedTouches: [finger as Touch],
    }),
  );
}

describe('zoom gesture disposal', () => {
  it('does not deliver the delayed wheel end after unmount in Strict Mode', () => {
    vi.useFakeTimers();
    const end = vi.fn();
    const view = render(
      <StrictMode>
        <ComposableMap>
          <ZoomableGroup onMoveEnd={end} />
        </ComposableMap>
      </StrictMode>,
    );
    wheel(zoomTarget(view));
    view.unmount();
    act(() => vi.advanceTimersByTime(200));
    expect(end).not.toHaveBeenCalled();
  });

  it('cancels an old wheel gesture and independently completes a replacement', () => {
    vi.useFakeTimers();
    const start = vi.fn();
    const end = vi.fn();
    const ui = (maxZoom: number) => (
      <ComposableMap>
        <ZoomableGroup maxZoom={maxZoom} onMoveStart={start} onMoveEnd={end} />
      </ComposableMap>
    );
    const view = render(ui(8));
    const target = zoomTarget(view);
    wheel(target);
    act(() => vi.advanceTimersByTime(100));
    view.rerender(ui(9));
    wheel(target);
    act(() => vi.advanceTimersByTime(60));
    expect(end).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(start).toHaveBeenCalledTimes(2);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('restores page mouse events and text selection after disposing an active drag', () => {
    vi.useFakeTimers();
    const move = vi.fn();
    const end = vi.fn();
    const pageMove = vi.fn();
    const pageUp = vi.fn();
    window.addEventListener('mousemove', pageMove);
    window.addEventListener('mouseup', pageUp);
    const view = render(
      <ComposableMap>
        <ZoomableGroup onMove={move} onMoveEnd={end} />
      </ComposableMap>,
    );
    try {
      mouse(zoomTarget(view), 'mousedown');
      mouse(window, 'mousemove', 430);
      move.mockClear();
      view.unmount();
      expect(mouse(window, 'mousemove', 450).defaultPrevented).toBe(false);
      expect(mouse(window, 'mouseup', 450).defaultPrevented).toBe(false);
      expect(mouse(window, 'dragstart').defaultPrevented).toBe(false);
      expect(mouse(window, 'selectstart').defaultPrevented).toBe(false);
      expect(mouse(window, 'click').defaultPrevented).toBe(false);
      expect(pageMove).toHaveBeenCalledTimes(1);
      expect(pageUp).toHaveBeenCalledTimes(1);
      expect(move).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
      expect(
        (
          document.documentElement.style as CSSStyleDeclaration & {
            MozUserSelect?: string;
          }
        ).MozUserSelect,
      ).not.toBe('none');
    } finally {
      window.removeEventListener('mousemove', pageMove);
      window.removeEventListener('mouseup', pageUp);
    }
  });

  it('restarts dragging after the behavior is recreated on the same element', () => {
    vi.useFakeTimers();
    const move = vi.fn();
    const end = vi.fn();
    const ui = (maxZoom: number) => (
      <ComposableMap>
        <ZoomableGroup maxZoom={maxZoom} onMove={move} onMoveEnd={end} />
      </ComposableMap>
    );
    const view = render(ui(8));
    const target = zoomTarget(view);
    mouse(target, 'mousedown');
    view.rerender(ui(9));
    mouse(window, 'mousemove', 450);
    mouse(window, 'mouseup', 450);
    expect(move).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
    mouse(target, 'mousedown');
    mouse(window, 'mousemove', 450);
    mouse(window, 'mouseup', 450);
    expect(move).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
    expect(zoomTransform(target).x).toBeCloseTo(50);
  });

  it('leaves another map active when it owns the current window drag handlers', () => {
    vi.useFakeTimers();
    const firstEnd = vi.fn();
    const secondMove = vi.fn();
    const secondEnd = vi.fn();
    const first = render(
      <ComposableMap>
        <ZoomableGroup onMoveEnd={firstEnd} />
      </ComposableMap>,
    );
    const second = render(
      <ComposableMap>
        <ZoomableGroup onMove={secondMove} onMoveEnd={secondEnd} />
      </ComposableMap>,
    );
    mouse(zoomTarget(first), 'mousedown');
    mouse(zoomTarget(second), 'mousedown');
    first.unmount();
    expect(mouse(window, 'mousemove', 450).defaultPrevented).toBe(true);
    mouse(window, 'mouseup', 450);
    expect(secondMove).toHaveBeenCalledTimes(1);
    expect(secondEnd).toHaveBeenCalledTimes(1);
    expect(firstEnd).not.toHaveBeenCalled();
  });

  it.each(['mouseup', 'unmount'])(
    'restores text selection after an overlapping drag ends by %s',
    (ending) => {
      vi.useFakeTimers();
      Reflect.set(document.documentElement.style, 'MozUserSelect', 'text');
      const first = render(
        <ComposableMap>
          <ZoomableGroup />
        </ComposableMap>,
      );
      const second = render(
        <ComposableMap>
          <ZoomableGroup filterZoomEvent={() => true} />
        </ComposableMap>,
      );
      mouse(zoomTarget(first), 'mousedown');
      mouse(zoomTarget(second), 'mousedown', 400, 2);
      first.unmount();
      mouse(window, 'mousemove', 450);
      if (ending === 'unmount') second.unmount();
      else mouse(window, 'mouseup', 450, 2);
      expect(Reflect.get(document.documentElement.style, 'MozUserSelect')).toBe(
        'text',
      );
    },
  );

  it('restores selection when the new overlapping map is removed in onMoveStart', () => {
    vi.useFakeTimers();
    Reflect.set(document.documentElement.style, 'MozUserSelect', 'text');
    const first = render(
      <ComposableMap>
        <ZoomableGroup />
      </ComposableMap>,
    );
    const second = render(
      <ComposableMap>
        <ZoomableGroup
          filterZoomEvent={() => true}
          onMoveStart={() => second.unmount()}
        />
      </ComposableMap>,
    );
    mouse(zoomTarget(first), 'mousedown');
    mouse(zoomTarget(second), 'mousedown', 400, 2);
    first.unmount();
    expect(Reflect.get(document.documentElement.style, 'MozUserSelect')).toBe(
      'text',
    );
  });

  it('ignores touches from a disposed behavior until a new touch gesture starts', () => {
    vi.useFakeTimers();
    const move = vi.fn();
    const end = vi.fn();
    const ui = (maxZoom: number) => (
      <ComposableMap>
        <ZoomableGroup maxZoom={maxZoom} onMove={move} onMoveEnd={end} />
      </ComposableMap>
    );
    const view = render(ui(8));
    const target = zoomTarget(view);
    touch(target, 'touchstart', 400);
    view.rerender(ui(9));
    touch(target, 'touchmove', 450);
    touch(target, 'touchend', 450);
    expect(move).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
    touch(target, 'touchstart', 400);
    touch(target, 'touchmove', 450);
    touch(target, 'touchend', 450);
    expect(move).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'interrupts double-click transitions on unmount (started: %s)',
    (started) => {
      vi.useFakeTimers();
      const move = vi.fn();
      const end = vi.fn();
      const view = render(
        <ComposableMap>
          <ZoomableGroup onMove={move} onMoveEnd={end} />
        </ComposableMap>,
      );
      const target = zoomTarget(view);
      fireEvent.doubleClick(target, { clientX: 400, clientY: 300 });
      if (started) act(() => vi.advanceTimersByTime(50));
      view.unmount();
      const finalTransform = zoomTransform(target);
      move.mockClear();
      end.mockClear();
      act(() => vi.advanceTimersByTime(400));
      expect(move).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
      expect(zoomTransform(target)).toEqual(finalTransform);
    },
  );

  it('does not create a wheel timer after onMoveStart synchronously unmounts the map', () => {
    vi.useFakeTimers();
    const move = vi.fn();
    const end = vi.fn();
    const view = render(
      <ComposableMap>
        <ZoomableGroup
          onMoveStart={() => view.unmount()}
          onMove={move}
          onMoveEnd={end}
        />
      </ComposableMap>,
    );
    const target = zoomTarget(view);
    const timers = vi.getTimerCount();
    wheel(target);
    expect(vi.getTimerCount()).toBe(timers);
    expect(zoomTransform(target).k).toBe(1);
    act(() => vi.advanceTimersByTime(200));
    expect(move).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  it.each([1, 2, 3])(
    'preserves replacement config when onMoveStart synchronously disables zoom (zoom=%s)',
    (zoom) => {
      vi.useFakeTimers();
      const move = vi.fn();
      const end = vi.fn();
      const view = render(
        <ComposableMap>
          <ZoomableGroup
            onMoveStart={() =>
              flushSync(() =>
                view.rerender(
                  <ComposableMap>
                    <ZoomableGroup
                      zoom={zoom}
                      center={createCoordinates(20, 10)}
                      enableZoom={false}
                      onMove={move}
                      onMoveEnd={end}
                    />
                  </ComposableMap>,
                ),
              )
            }
          />
        </ComposableMap>,
      );
      const target = zoomTarget(view);
      const timers = vi.getTimerCount();
      wheel(target);
      expect(vi.getTimerCount()).toBe(timers);
      expect(zoomTransform(target).k).toBe(zoom);
      expect(
        view.container
          .querySelector('.rsm-zoomable-group')!
          .getAttribute('transform'),
      ).toBe(zoomTransform(target).toString().replace(',', ' '));
      expect(move).not.toHaveBeenCalled();
      mouse(target, 'mousedown');
      mouse(window, 'mousemove', 450);
      mouse(window, 'mouseup', 450);
      expect(zoomTransform(target).k).toBe(zoom);
      expect(move).toHaveBeenCalledTimes(1);
      expect(end).toHaveBeenCalledTimes(1);
    },
  );

  it('cancels a wheel timer even when a later drag replaces its active gesture', () => {
    vi.useFakeTimers();
    const end = vi.fn();
    const view = render(
      <ComposableMap>
        <ZoomableGroup onMoveEnd={end} />
      </ComposableMap>,
    );
    const target = zoomTarget(view);
    wheel(target);
    mouse(target, 'mousedown');
    view.unmount();
    act(() => vi.advanceTimersByTime(200));
    mouse(window, 'mouseup');
    expect(end).not.toHaveBeenCalled();
  });
});

describe('live zoom filters', () => {
  it('keeps controlled wheel ticks in one gesture when its inline filter rerenders', () => {
    vi.useFakeTimers();
    const end = vi.fn();
    function Controlled() {
      const [position, setPosition] = useState<Position>({
        coordinates: createCoordinates(0, 0),
        zoom: 1,
      });
      return (
        <ComposableMap>
          <ZoomableGroup
            center={position.coordinates}
            zoom={position.zoom}
            filterZoomEvent={() => true}
            onMove={setPosition}
            onMoveEnd={end}
          />
        </ComposableMap>
      );
    }
    const view = render(<Controlled />);
    const target = zoomTarget(view);
    wheel(target);
    const firstScale = zoomTransform(target).k;
    wheel(target);
    expect(zoomTransform(target).k).toBeGreaterThan(firstScale);
    act(() => vi.advanceTimersByTime(200));
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('uses the latest filter for new gestures after a parent rerender', () => {
    vi.useFakeTimers();
    const ui = (allow: boolean) => (
      <ComposableMap>
        <ZoomableGroup filterZoomEvent={() => allow} />
      </ComposableMap>
    );
    const view = render(ui(false));
    const target = zoomTarget(view);
    wheel(target);
    expect(zoomTransform(target).k).toBe(1);
    view.rerender(ui(true));
    wheel(target);
    expect(zoomTransform(target).k).toBeGreaterThan(1);
    act(() => vi.advanceTimersByTime(200));
    const allowedScale = zoomTransform(target).k;
    view.rerender(ui(false));
    wheel(target);
    expect(zoomTransform(target).k).toBe(allowedScale);
  });
  it('keeps a controlled drag active when its inline filter rerenders', () => {
    vi.useFakeTimers();
    const end = vi.fn();
    function Controlled() {
      const [position, setPosition] = useState<Position>({
        coordinates: createCoordinates(0, 0),
        zoom: 1,
      });
      return (
        <ComposableMap>
          <ZoomableGroup
            center={position.coordinates}
            zoom={position.zoom}
            filterZoomEvent={() => true}
            onMove={setPosition}
            onMoveEnd={end}
          />
        </ComposableMap>
      );
    }
    const view = render(<Controlled />);
    const target = zoomTarget(view);
    mouse(target, 'mousedown');
    mouse(window, 'mousemove', 450);
    mouse(window, 'mousemove', 500);
    mouse(window, 'mouseup', 500);
    expect(zoomTransform(target).x).toBeCloseTo(100);
    expect(end).toHaveBeenCalledTimes(1);
  });
});
