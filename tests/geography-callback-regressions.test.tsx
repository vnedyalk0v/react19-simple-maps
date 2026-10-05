import { StrictMode, act, useState } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ComposableMap from '../src/components/ComposableMap';
import Geographies from '../src/components/Geographies';
import { fetchGeographiesCache } from '../src/utils/geography-fetching';

vi.mock('../src/utils/geography-fetching', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/geography-fetching')>()),
  fetchGeographiesCache: vi.fn(),
}));
const fetchMock = vi.mocked(fetchGeographiesCache);

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
});

describe('Geographies fetch error notifications', () => {
  it('reports a failure once when an inline callback updates parent state', async () => {
    let reject!: (error: Error) => void;
    fetchMock.mockImplementation(
      () => new Promise((_resolve, rejectRequest) => (reject = rejectRequest)),
    );
    const onError = vi.fn();
    function Parent() {
      const [count, setCount] = useState(0);
      return (
        <ComposableMap>
          <Geographies
            geography="https://example.com/failure.json"
            onGeographyError={(error) => {
              onError(error);
              // Bound the old implementation's repeated notification loop.
              if (count < 3) setCount(count + 1);
            }}
          >
            {() => null}
          </Geographies>
          <text data-testid="count">{count}</text>
        </ComposableMap>
      );
    }
    const view = render(
      <StrictMode>
        <Parent />
      </StrictMode>,
    );
    const failure = new Error('fetch failed');
    await act(async () => reject(failure));
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(view.getByTestId('count').textContent).toBe('1');
  });

  it('reports a new failed attempt even when it rejects with the same Error', async () => {
    let reject!: (error: Error) => void;
    fetchMock.mockImplementation(
      () => new Promise((_resolve, rejectRequest) => (reject = rejectRequest)),
    );
    const onError = vi.fn();
    const view = render(
      <ComposableMap>
        <Geographies
          geography="https://example.com/failure.json"
          errorBoundary
          onGeographyError={onError}
          fallback={(_error, retry) => <text onClick={retry}>Retry</text>}
        >
          {() => null}
        </Geographies>
      </ComposableMap>,
    );
    const failure = new Error('fetch failed');
    await act(async () => reject(failure));
    expect(onError).toHaveBeenCalledTimes(1);
    act(() =>
      view
        .getByText('Retry')
        .dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    await act(async () => reject(failure));
    expect(onError).toHaveBeenCalledTimes(2);
  });
});
