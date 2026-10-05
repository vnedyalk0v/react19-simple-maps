import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GeographyErrorBoundary from '../src/components/GeographyErrorBoundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GeographyErrorBoundary thrown values', () => {
  it.each([
    { label: 'null', failure: null },
    { label: 'undefined', failure: undefined },
    { label: 'false', failure: false },
    { label: 'zero', failure: 0 },
    { label: 'empty string', failure: '' },
    { label: 'string', failure: 'render failed' },
    { label: 'object', failure: { reason: 'render failed' } },
    { label: 'Error', failure: new Error('render failed') },
  ])('renders a fallback for a thrown $label', ({ failure }) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    const fallback = vi.fn((error: Error) => (
      <text data-testid="fallback">{error.message}</text>
    ));
    function Thrower(): never {
      throw failure;
    }

    const view = render(
      <svg>
        <GeographyErrorBoundary onError={onError} fallback={fallback}>
          <Thrower />
        </GeographyErrorBoundary>
      </svg>,
    );

    const reported = onError.mock.calls[0]?.[0] as Error;
    expect(view.getByTestId('fallback')).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(reported).toBeInstanceOf(Error);
    expect(reported.message).toBe(
      failure instanceof Error ? failure.message : String(failure),
    );
    expect(fallback).toHaveBeenLastCalledWith(reported, expect.any(Function));
    if (failure instanceof Error) expect(reported).toBe(failure);
  });

  it('handles thrown objects that cannot be converted to a string', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = Object.create(null) as object;
    const onError = vi.fn();
    function Thrower(): never {
      throw failure;
    }
    const view = render(
      <svg>
        <GeographyErrorBoundary
          onError={onError}
          fallback={(error) => <text>{error.message}</text>}
        >
          <Thrower />
        </GeographyErrorBoundary>
      </svg>,
    );

    expect(view.getByText('Unknown geography rendering error')).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('retries after a non-Error failure', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail = true;
    function Child() {
      if (fail) throw null;
      return <text>Recovered</text>;
    }
    const view = render(
      <svg>
        <GeographyErrorBoundary
          fallback={(_error, retry) => <text onClick={retry}>Retry</text>}
        >
          <Child />
        </GeographyErrorBoundary>
      </svg>,
    );

    fail = false;
    fireEvent.click(view.getByText('Retry'));
    expect(view.getByText('Recovered')).toBeTruthy();
    expect(view.queryByText('Retry')).toBeNull();
  });
});
