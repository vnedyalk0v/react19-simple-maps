import { createRef, StrictMode } from 'react';
import type { Ref, RefCallback } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ComposableMap, Marker, createCoordinates } from '../src';
import type { Coordinates } from '../src';

const inside = createCoordinates(-100, 40);
const outside = createCoordinates(20, 40);

function MapFixture({
  coordinates,
  markerRef,
}: {
  coordinates: Coordinates;
  markerRef?: Ref<SVGGElement>;
}) {
  return (
    <StrictMode>
      <button data-testid="outside">Outside</button>
      <ComposableMap projection="geoAlbersUsa">
        <Marker
          coordinates={coordinates}
          {...(markerRef !== undefined && { ref: markerRef })}
          tabIndex={0}
          data-testid="marker"
          style={{
            default: { fill: 'black' },
            focused: { fill: 'red' },
            hover: { fill: 'green' },
            pressed: { fill: 'blue' },
          }}
        >
          <circle r={4} />
        </Marker>
      </ComposableMap>
    </StrictMode>
  );
}

afterEach(cleanup);

describe('Marker visibility lifecycle', () => {
  it('starts unfocused when coordinates reenter the projection after focus moved outside', () => {
    const view = render(<MapFixture coordinates={inside} />);
    const original = view.getByTestId('marker');
    expect(original).toBeInstanceOf(SVGElement);
    if (!(original instanceof SVGElement))
      throw new Error('Expected SVG marker');
    act(() => original.focus());
    expect(document.activeElement).toBe(original);
    expect(original.style.fill).toBe('red');

    view.rerender(<MapFixture coordinates={outside} />);
    const button = view.getByTestId('outside');
    act(() => button.focus());
    expect(document.activeElement).toBe(button);

    view.rerender(<MapFixture coordinates={inside} />);
    const restored = view.getByTestId('marker');
    if (!(restored instanceof SVGElement))
      throw new Error('Expected SVG marker');
    expect(document.activeElement).toBe(button);
    expect(restored.style.fill).toBe('black');
    act(() => restored.focus());
    expect(restored.style.fill).toBe('red');
  });

  it.each(['hover', 'pressed'] as const)(
    'clears %s when the marker leaves and reenters the projection',
    (interaction) => {
      const view = render(<MapFixture coordinates={inside} />);
      const original = view.getByTestId('marker');
      if (!(original instanceof SVGElement))
        throw new Error('Expected SVG marker');
      fireEvent.mouseEnter(original);
      if (interaction === 'pressed') fireEvent.mouseDown(original);
      expect(original.style.fill).toBe(
        interaction === 'pressed' ? 'blue' : 'green',
      );

      view.rerender(<MapFixture coordinates={outside} />);
      fireEvent.mouseUp(view.getByTestId('outside'));
      view.rerender(<MapFixture coordinates={inside} />);
      const restored = view.getByTestId('marker');
      if (!(restored instanceof SVGElement))
        throw new Error('Expected SVG marker');
      expect(restored.style.fill).toBe('black');
    },
  );

  it('preserves focus and its SVG node between projectable coordinate updates', () => {
    const view = render(<MapFixture coordinates={inside} />);
    const original = view.getByTestId('marker');
    if (!(original instanceof SVGElement))
      throw new Error('Expected SVG marker');
    act(() => original.focus());
    view.rerender(<MapFixture coordinates={createCoordinates(-90, 38)} />);
    expect(view.getByTestId('marker')).toBe(original);
    expect(document.activeElement).toBe(original);
    expect(original.style.fill).toBe('red');
  });

  it('clears object refs while omitted and assigns the recreated SVG node', () => {
    const ref = createRef<SVGGElement>();
    const view = render(<MapFixture coordinates={inside} markerRef={ref} />);
    const original = view.getByTestId('marker');
    expect(ref.current).toBe(original);
    view.rerender(<MapFixture coordinates={outside} markerRef={ref} />);
    expect(ref.current).toBeNull();
    view.rerender(<MapFixture coordinates={inside} markerRef={ref} />);
    expect(ref.current).toBe(view.getByTestId('marker'));
    expect(ref.current).not.toBe(original);
    view.unmount();
    expect(ref.current).toBeNull();
  });

  it('runs callback ref cleanups for removed and recreated SVG nodes', () => {
    const attached: SVGGElement[] = [];
    const detached: SVGGElement[] = [];
    const ref: RefCallback<SVGGElement> = (element) => {
      if (!element) return;
      attached.push(element);
      return () => {
        detached.push(element);
      };
    };
    const view = render(<MapFixture coordinates={inside} markerRef={ref} />);
    const original: Element = view.getByTestId('marker');
    const initialCleanups = detached.filter(
      (element) => element === original,
    ).length;
    view.rerender(<MapFixture coordinates={outside} markerRef={ref} />);
    expect(detached.filter((element) => element === original)).toHaveLength(
      initialCleanups + 1,
    );
    view.rerender(<MapFixture coordinates={inside} markerRef={ref} />);
    const restored: Element = view.getByTestId('marker');
    expect(restored).not.toBe(original);
    expect(attached.at(-1)).toBe(restored);
    const restoredCleanups = detached.filter(
      (element) => element === restored,
    ).length;
    view.unmount();
    expect(detached.filter((element) => element === restored)).toHaveLength(
      restoredCleanups + 1,
    );
  });
});
