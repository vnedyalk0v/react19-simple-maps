import { act, type RefObject, StrictMode, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoomTransform } from 'd3-zoom';
import { ComposableMap, useZoomPan, createCoordinates } from '../src/index';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function descendantTarget(strict: boolean, initiallyVisible: boolean) {
  const onMoveEnd = vi.fn();
  let show = () => {};
  let hide = () => {};
  let replace = () => {};
  function Target({
    mapRef,
    transformString,
  }: {
    mapRef: RefObject<SVGGElement | null>;
    transformString: string;
  }) {
    const [visible, setVisible] = useState(initiallyVisible);
    const [generation, setGeneration] = useState(0);
    show = () => setVisible(true);
    hide = () => setVisible(false);
    replace = () => setGeneration((value) => value + 1);
    return visible ? (
      <g key={generation} ref={mapRef} data-testid="target">
        <g transform={transformString} data-testid="content" />
      </g>
    ) : null;
  }
  function CustomMap() {
    const { mapRef, transformString } = useZoomPan({
      center: createCoordinates(20, 10),
      zoom: 3,
      onMoveEnd,
    });
    return <Target mapRef={mapRef} transformString={transformString} />;
  }
  const content = (
    <ComposableMap>
      <CustomMap />
    </ComposableMap>
  );
  const view = render(strict ? <StrictMode>{content}</StrictMode> : content);
  return {
    view,
    onMoveEnd,
    show: () => act(() => show()),
    hide: () => act(() => hide()),
    replace: () => act(() => replace()),
  };
}

function wheel(target: Element) {
  fireEvent.wheel(target, {
    deltaY: -100,
    clientX: 400,
    clientY: 300,
  });
}

function expectRequestedViewport(view: ReturnType<typeof render>) {
  const transform = zoomTransform(view.getByTestId('target'));
  expect(transform.k).toBe(3);
  expect(view.getByTestId('content').getAttribute('transform')).toBe(
    `translate(${transform.x} ${transform.y}) scale(3)`,
  );
}

describe.each([false, true])(
  'descendant ref commits (StrictMode=%s)',
  (strict) => {
    it('initializes a hook target revealed by a descendant state update', () => {
      vi.useFakeTimers();
      const { view, show } = descendantTarget(strict, false);
      show();
      expectRequestedViewport(view);
      wheel(view.getByTestId('target'));
      expect(zoomTransform(view.getByTestId('target')).k).toBeGreaterThan(3);
      act(() => vi.runOnlyPendingTimers());
    });

    it('initializes a replacement target and disposes the previous gesture', () => {
      vi.useFakeTimers();
      const { view, replace, onMoveEnd } = descendantTarget(strict, true);
      const previous = view.getByTestId('target');
      wheel(previous);
      replace();
      const target = view.getByTestId('target');
      expect(target).not.toBe(previous);
      expectRequestedViewport(view);
      act(() => vi.runOnlyPendingTimers());
      expect(onMoveEnd).not.toHaveBeenCalled();
      wheel(target);
      expect(zoomTransform(target).k).toBeGreaterThan(3);
      act(() => vi.runOnlyPendingTimers());
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
    });

    it('cancels pending callbacks when a descendant removes the target', () => {
      vi.useFakeTimers();
      const { view, hide, show, onMoveEnd } = descendantTarget(strict, true);
      wheel(view.getByTestId('target'));
      hide();
      act(() => vi.runOnlyPendingTimers());
      expect(onMoveEnd).not.toHaveBeenCalled();
      show();
      expectRequestedViewport(view);
      wheel(view.getByTestId('target'));
      act(() => vi.runOnlyPendingTimers());
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
    });
  },
);
