import { StrictMode, act, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoomTransform } from 'd3-zoom';
import ComposableMap from '../src/components/ComposableMap';
import useZoomPan from '../src/components/useZoomPan';
import { createCoordinates } from '../src/types';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useZoomPan target lifecycle', () => {
  it('initializes a target mounted after the hook first renders', () => {
    vi.useFakeTimers();
    let reveal!: () => void;
    function CustomMap() {
      const [visible, setVisible] = useState(false);
      reveal = () => setVisible(true);
      const { mapRef, transformString } = useZoomPan({
        center: createCoordinates(20, 10),
        zoom: 3,
      });
      return visible ? (
        <g ref={mapRef} data-testid="target">
          <g data-testid="content" transform={transformString} />
        </g>
      ) : null;
    }
    const view = render(
      <StrictMode>
        <ComposableMap>
          <CustomMap />
        </ComposableMap>
      </StrictMode>,
    );
    act(() => reveal());
    const target = view.getByTestId('target') as unknown as SVGGElement;
    expect(zoomTransform(target).k).toBe(3);
    expect(view.getByTestId('content').getAttribute('transform')).toBe(
      `translate(${zoomTransform(target).x} ${zoomTransform(target).y}) scale(3)`,
    );
    fireEvent.wheel(target, { deltaY: -100, clientX: 400, clientY: 300 });
    expect(zoomTransform(target).k).toBeGreaterThan(3);
    act(() => vi.runOnlyPendingTimers());
  });

  it('initializes a replacement target even when center and zoom stay the same', () => {
    vi.useFakeTimers();
    let replace!: () => void;
    function CustomMap() {
      const [generation, setGeneration] = useState(0);
      replace = () => setGeneration((value) => value + 1);
      const { mapRef, transformString } = useZoomPan({
        center: createCoordinates(20, 10),
        zoom: 3,
      });
      return (
        <g key={generation} ref={mapRef} data-testid="target">
          <g data-testid="content" transform={transformString} />
        </g>
      );
    }
    const view = render(
      <StrictMode>
        <ComposableMap>
          <CustomMap />
        </ComposableMap>
      </StrictMode>,
    );
    const previous = view.getByTestId('target') as unknown as SVGGElement;
    const initial = zoomTransform(previous);
    act(() => replace());
    const target = view.getByTestId('target') as unknown as SVGGElement;
    expect(target).not.toBe(previous);
    expect(zoomTransform(target).toString()).toBe(initial.toString());
    fireEvent.wheel(target, { deltaY: -100, clientX: 400, clientY: 300 });
    expect(zoomTransform(target).k).toBeGreaterThan(3);
    act(() => vi.runOnlyPendingTimers());
  });

  it('cancels a pending gesture when the target is removed but the hook remains mounted', () => {
    vi.useFakeTimers();
    const onMoveEnd = vi.fn();
    let hide!: () => void;
    function CustomMap() {
      const [visible, setVisible] = useState(true);
      hide = () => setVisible(false);
      const { mapRef } = useZoomPan({
        center: createCoordinates(0, 0),
        onMoveEnd,
      });
      return visible ? <g ref={mapRef} data-testid="target" /> : null;
    }
    const view = render(
      <ComposableMap>
        <CustomMap />
      </ComposableMap>,
    );
    fireEvent.wheel(view.getByTestId('target'), {
      deltaY: -100,
      clientX: 400,
      clientY: 300,
    });
    act(() => hide());
    act(() => vi.runOnlyPendingTimers());
    expect(onMoveEnd).not.toHaveBeenCalled();
  });
});
