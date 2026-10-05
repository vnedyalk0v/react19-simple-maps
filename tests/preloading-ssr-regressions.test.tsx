// @vitest-environment node
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import {
  preloadGeography,
  fetchGeographiesCache,
  configureGeographySecurity,
  DEFAULT_GEOGRAPHY_FETCH_CONFIG,
  configureSRI,
  DEFAULT_SRI_CONFIG,
} from '../src/utils/index';

const data = JSON.stringify({ type: 'FeatureCollection', features: [] });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  configureGeographySecurity(DEFAULT_GEOGRAPHY_FETCH_CONFIG);
  configureSRI(DEFAULT_SRI_CONFIG);
});

it('emits geography hints for each independent server render', async () => {
  vi.stubEnv('NODE_ENV', 'test');
  configureGeographySecurity(DEFAULT_GEOGRAPHY_FETCH_CONFIG);
  configureSRI(DEFAULT_SRI_CONFIG);
  vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
    lookup: async () => [{ address: '8.8.8.8' }],
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(data, {
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
  const url = 'https://8.8.8.8/ssr-repeat-preload.json';
  function Page() {
    preloadGeography(url);
    return createElement(
      'html',
      null,
      createElement('head'),
      createElement('body'),
    );
  }

  const first = renderToString(createElement(Page));
  const second = renderToString(createElement(Page));
  await fetchGeographiesCache(url);

  expect(first).toContain('rel="preload"');
  expect(first).toContain(url);
  expect(second).toContain('rel="preload"');
  expect(second).toContain(url);
});
