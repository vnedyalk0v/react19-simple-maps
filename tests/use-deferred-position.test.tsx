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
      <button
        type="button"
        onClick={() => {
          setPosition({
            x: 48,
            y: 72,
            k: 6,
            dragging: new Event('zoom'),
          });
        }}
      >
        set position only
      </button>
      <output data-testid="position-k">{position.k}</output>
      <output data-testid="optimistic-k">{optimisticPosition.k}</output>
      <output data-testid="optimistic-x">{optimisticPosition.x}</output>
      <output data-testid="optimistic-y">{optimisticPosition.y}</output>
      <output data-testid="transform-string">{transformString}</output>
    </>
  );
}

describe('useDeferredPosition', () => {
  it('does not trigger React optimistic update warnings during interaction updates', () => {
    const originalConsoleError = console.error;
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation((...args: unknown[]) => {
        const message = args.find(
          (value): value is string => typeof value === 'string',
        );

        if (
          message?.includes(
            'An optimistic state update occurred outside a transition or action',
          )
        ) {
          return;
        }

        originalConsoleError(...args);
      });

    try {
      render(<DeferredPositionHarness />);
      fireEvent.click(screen.getByRole('button', { name: 'update position' }));

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
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('preserves caller-provided zoom values instead of clamping them', () => {
    render(<DeferredPositionHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'set high zoom' }));

    expect(screen.getByTestId('position-k').textContent).toBe('12');
    expect(screen.getByTestId('optimistic-k').textContent).toBe('12');
    expect(screen.getByTestId('transform-string').textContent).toContain(
      'scale(12)',
    );
  });

  it('keeps optimistic state and transform string in sync when setPosition is used directly', () => {
    render(<DeferredPositionHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'set position only' }));

    expect(screen.getByTestId('position-k').textContent).toBe('6');
    expect(screen.getByTestId('optimistic-k').textContent).toBe('6');
    expect(screen.getByTestId('optimistic-x').textContent).toBe('48');
    expect(screen.getByTestId('optimistic-y').textContent).toBe('72');
    expect(screen.getByTestId('transform-string').textContent).toBe(
      'translate(48 72) scale(6)',
    );
  });
});
