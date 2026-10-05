import { StrictMode } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComposableMap, GeographyErrorBoundary, useGeographies } from '../src';

const validBody = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Recovered' },
      geometry: { type: 'Point', coordinates: [10, 20] },
    },
  ],
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Probe({ url }: { url: string }) {
  const { isLoading, error, geographies, refetch } = useGeographies({
    geography: url,
  });
  const errorType = error && 'type' in error ? String(error.type) : '';
  return (
    <g>
      <text data-testid="status">
        {isLoading ? 'loading' : error ? errorType : 'ready'}
      </text>
      <text role="button" onClick={() => refetch?.()}>
        Retry
      </text>
      {geographies.map((geography) => (
        <path key={geography.rsmKey} d={geography.svgPath} />
      ))}
    </g>
  );
}

describe('fetched malformed geography hook recovery', () => {
  it.each([
    {
      name: 'null-feature',
      body: '{"type":"FeatureCollection","features":[null]}',
    },
    {
      name: 'missing-coordinates',
      body: '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Point"}}]}',
    },
    {
      name: 'missing-arc',
      body: '{"type":"Topology","objects":{"land":{"type":"Polygon","arcs":[[0]]}},"arcs":[]}',
    },
  ])(
    'reports $name through error state and recovers with refetch',
    async ({ name, body }) => {
      const fetch = vi
        .fn()
        .mockImplementationOnce(
          async () =>
            new Response(body, {
              headers: { 'content-type': 'application/json' },
            }),
        )
        .mockImplementation(
          async () =>
            new Response(validBody, {
              headers: { 'content-type': 'application/json' },
            }),
        );
      vi.stubGlobal('fetch', fetch);
      const view = render(
        <StrictMode>
          <ComposableMap>
            <GeographyErrorBoundary
              fallback={() => <text data-testid="render-crash">crashed</text>}
            >
              <Probe url={`https://8.8.8.8/hook-${name}.json`} />
            </GeographyErrorBoundary>
          </ComposableMap>
        </StrictMode>,
      );
      expect(view.getByTestId('status').textContent).toBe('loading');
      await waitFor(() => {
        expect(view.getByTestId('status').textContent).toBe('VALIDATION_ERROR');
      });
      expect(view.queryByTestId('render-crash')).toBeNull();
      expect(view.container.querySelectorAll('path')).toHaveLength(0);
      expect(fetch).toHaveBeenCalledTimes(1);

      fireEvent.click(view.getByRole('button', { name: 'Retry' }));
      expect(view.getByTestId('status').textContent).toBe('loading');
      await waitFor(() => {
        expect(view.getByTestId('status').textContent).toBe('ready');
      });
      expect(view.queryByTestId('render-crash')).toBeNull();
      expect(view.container.querySelectorAll('path')).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
});
