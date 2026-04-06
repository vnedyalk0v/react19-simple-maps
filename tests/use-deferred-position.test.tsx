import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDeferredPosition } from '../src/hooks/useDeferredPosition';

function DeferredPositionHarness() {
  const { setOptimisticPosition, setPosition, startTransition } =
    useDeferredPosition();

  return (
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
});
