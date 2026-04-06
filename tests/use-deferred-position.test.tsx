import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDeferredPosition } from '../src/hooks/useDeferredPosition';

function DeferredPositionHarness() {
  const {
    setOptimisticPosition,
    setPosition,
    startTransition,
    position,
    optimisticPosition,
    transformString,
  } = useDeferredPosition({ deferredUpdateThreshold: 0 });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const nextPosition = {
            x: 12,
            y: 18,
            k: 1.5,
            dragging: new Event('zoom'),
          };

          setOptimisticPosition(nextPosition);
          startTransition(() => {
            setPosition(nextPosition);
          });
        }}
      >
        update position
      </button>
      <button
        type="button"
        onClick={() => {
          const nextPosition = {
            x: 24,
            y: 36,
            k: 12,
            dragging: new Event('zoom'),
          };

          setOptimisticPosition(nextPosition);
          setPosition(nextPosition);
        }}
      >
        set high zoom
      </button>
      <output data-testid="position-k">{position.k}</output>
      <output data-testid="optimistic-k">{optimisticPosition.k}</output>
      <output data-testid="transform-string">{transformString}</output>
    </>
  );
}

describe('useDeferredPosition', () => {
  it('does not trigger React optimistic update warnings during interaction updates', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByRole } = render(<DeferredPositionHarness />);
    fireEvent.click(getByRole('button', { name: 'update position' }));

    const optimisticWarnings = consoleErrorSpy.mock.calls.filter((call) =>
      call.some(
        (value) =>
          typeof value === 'string' &&
          value.includes(
            'An optimistic state update occurred outside a transition or action',
          ),
      ),
    );

    expect(optimisticWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });

  it('preserves caller-provided zoom values instead of clamping them', () => {
    const { getByRole } = render(<DeferredPositionHarness />);

    fireEvent.click(getByRole('button', { name: 'set high zoom' }));

    expect(screen.getByTestId('position-k').textContent).toBe('12');
    expect(screen.getByTestId('optimistic-k').textContent).toBe('12');
    expect(screen.getByTestId('transform-string').textContent).toContain(
      'scale(12)',
    );
  });
});
