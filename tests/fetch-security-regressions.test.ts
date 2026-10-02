// @vitest-environment node
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchGeographiesCache,
  preloadGeography,
} from '../src/utils/geography-fetching';
import {
  configureGeographySecurity,
  getGeographySecurityConfig,
  isPrivateIPAddress,
  validateGeographyUrl,
  DEFAULT_GEOGRAPHY_FETCH_CONFIG,
} from '../src/utils/geography-validation';
import {
  configureSRI,
  generateSRIHash,
  getSRIForUrl,
  DEFAULT_SRI_CONFIG,
} from '../src/utils/subresource-integrity';

const featureCollection = JSON.stringify({
  type: 'FeatureCollection',
  features: [],
});
const jsonHeaders = { 'content-type': 'application/json' };
const originalNodeEnv = process.env.NODE_ENV;
let urlCounter = 0;
const uniqueUrl = (name: string) =>
  `https://8.8.8.8/${name}-${++urlCounter}.json`;

function publicLookup(): Promise<Array<{ address: string }>> {
  return Promise.resolve([{ address: '8.8.8.8' }]);
}

// configureSRI merges customSRIMap, so tests that add custom SRI entries use
// fresh module instances to keep those entries from leaking into other tests.
async function freshFetchModules() {
  vi.resetModules();
  const [fetching, validation, sri] = await Promise.all([
    import('../src/utils/geography-fetching'),
    import('../src/utils/geography-validation'),
    import('../src/utils/subresource-integrity'),
  ]);
  return { ...fetching, ...validation, ...sri };
}

const okFetch = () =>
  vi.fn(async () => new Response(featureCollection, { headers: jsonHeaders }));

beforeEach(() => {
  configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
  configureSRI({ ...DEFAULT_SRI_CONFIG });
  vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
    lookup: publicLookup,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env.NODE_ENV = originalNodeEnv;
  configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
  configureSRI({ ...DEFAULT_SRI_CONFIG });
});

describe('private IP detection only applies IPv4 ranges to IPv4 literals', () => {
  it.each([
    'https://10.example.com/a.json',
    'https://0.tiles.example.com/a.json',
    'https://127.cdn.example.org/a.json',
    'https://192.168.example.net/a.json',
  ])('allows DNS name %s', (url) => {
    expect(() => validateGeographyUrl(url)).not.toThrow();
  });

  it('still blocks IPv4 literals and IPv4-mapped IPv6', () => {
    expect(isPrivateIPAddress('10.0.0.1')).toBe(true);
    expect(isPrivateIPAddress('[::ffff:7f00:1]')).toBe(true);
    expect(isPrivateIPAddress('::ffff:192.168.1.1')).toBe(true);
    expect(isPrivateIPAddress('8.8.8.8')).toBe(false);
  });
});

describe('fetchGeographiesCache cancels unread bodies on early failures', () => {
  it.each<[string, ResponseInit]>([
    ['non-OK status', { status: 404, headers: jsonHeaders }],
    [
      'bad content type',
      { status: 200, headers: { 'content-type': 'text/html' } },
    ],
    [
      'oversized content-length',
      {
        status: 200,
        headers: { ...jsonHeaders, 'content-length': String(60 * 1024 * 1024) },
      },
    ],
  ])('cancels the body for %s', async (_name, init) => {
    const onCancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{'));
      },
      cancel: onCancel,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, init)));

    await expect(fetchGeographiesCache(uniqueUrl('cancel'))).rejects.toThrow();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('fetchGeographiesCache shares only in-flight requests', () => {
  it('shares one request between concurrent callers', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const url = uniqueUrl('dedupe');

    const [first, second] = await Promise.all([
      fetchGeographiesCache(url),
      fetchGeographiesCache(url),
    ]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('starts a new request after a previous one succeeded', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const url = uniqueUrl('refetch');

    await fetchGeographiesCache(url);
    await fetchGeographiesCache(url);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reuses the in-flight request started by preloadGeography', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const url = uniqueUrl('preload');

    preloadGeography(url);
    await fetchGeographiesCache(url);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('applies custom SRI added after a successful fetch', async () => {
    const { addCustomSRI, fetchGeographiesCache: fetchFresh } =
      await freshFetchModules();
    vi.stubGlobal('fetch', okFetch());
    const url = uniqueUrl('late-sri');

    await fetchFresh(url);
    addCustomSRI(url, {
      algorithm: 'sha256',
      hash: 'sha256-AAAA',
      enforceIntegrity: true,
    });

    await expect(fetchFresh(url)).rejects.toMatchObject({
      type: 'SECURITY_ERROR',
    });
  });

  it('applies tightened content types after a successful fetch', async () => {
    vi.stubGlobal('fetch', okFetch());
    const url = uniqueUrl('late-content-type');

    await fetchGeographiesCache(url);
    configureGeographySecurity({
      ALLOWED_CONTENT_TYPES: ['application/geo+json'],
    });

    await expect(fetchGeographiesCache(url)).rejects.toThrow(
      /Invalid content type/,
    );
  });

  it('does not share an in-flight request across an SRI change', async () => {
    const { addCustomSRI, fetchGeographiesCache: fetchFresh } =
      await freshFetchModules();
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const url = uniqueUrl('in-flight-sri');

    const first = fetchFresh(url);
    addCustomSRI(url, {
      algorithm: 'sha256',
      hash: 'sha256-AAAA',
      enforceIntegrity: true,
    });
    const second = fetchFresh(url);

    await expect(first).resolves.toBeDefined();
    await expect(second).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not share an in-flight request across a security config change', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const url = uniqueUrl('in-flight-security');

    const first = fetchGeographiesCache(url);
    configureGeographySecurity({
      ALLOWED_CONTENT_TYPES: ['application/geo+json'],
    });
    const second = fetchGeographiesCache(url);

    await expect(first).resolves.toBeDefined();
    await expect(second).rejects.toThrow(/Invalid content type/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries after a failed request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(featureCollection, { headers: jsonHeaders }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const url = uniqueUrl('retry');

    await expect(fetchGeographiesCache(url)).rejects.toThrow(/HTTP 500/);
    await expect(fetchGeographiesCache(url)).resolves.toEqual(
      JSON.parse(featureCollection),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('emits resource hints synchronously during server rendering', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(featureCollection, { headers: jsonHeaders }),
      ),
    );
    const url = uniqueUrl('ssr-hints');
    function Page() {
      preloadGeography(url);
      return createElement(
        'html',
        null,
        createElement('head'),
        createElement('body'),
      );
    }

    const html = renderToString(createElement(Page));

    expect(html).toContain('rel="preload"');
    expect(html).toContain(url);
  });
});

describe('production localhost blocking', () => {
  it.each(['https://localhost./a.json', 'https://foo.localhost/a.json'])(
    'blocks %s in production',
    (url) => {
      process.env.NODE_ENV = 'production';
      expect(() => validateGeographyUrl(url)).toThrow(
        /Localhost access is not allowed in production/,
      );
    },
  );

  it('treats localhost variants like localhost for development HTTP access', () => {
    configureGeographySecurity({
      STRICT_HTTPS_ONLY: false,
      ALLOW_HTTP_LOCALHOST: true,
      ALLOWED_PROTOCOLS: ['https:', 'http:'],
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      validateGeographyUrl('http://localhost./a.json'),
    ).not.toThrow();
    expect(() =>
      validateGeographyUrl('http://foo.localhost/a.json'),
    ).not.toThrow();
    expect(() => validateGeographyUrl('http://example.com/a.json')).toThrow(
      /only allowed for localhost/,
    );
  });
});

describe('known-source SRI lookup ignores byte-identical URL variants', () => {
  it.each([
    'https://unpkg.com/world-atlas@2/countries-110m.json?',
    'https://unpkg.com/world-atlas@2/countries-110m.json?v=1',
    'https://unpkg.com/world-atlas%402/countries-110m.json',
    'https://unpkg.com./world-atlas@2/countries-110m.json',
  ])('enforces known SRI for %s', (url) => {
    expect(getSRIForUrl(url)).toMatchObject({
      hash: 'sha384-yOCJ+8ShBm8UDqtAVtAvxTDDf4gXo5edxl/YG0FmVC5OTmqVLl7utuVGBDEeZWHf',
    });
  });

  it('keeps the query significant for custom SRI entries', async () => {
    const { addCustomSRI, getSRIForUrl } = await freshFetchModules();
    addCustomSRI('https://example.com/data.json?v=1', {
      algorithm: 'sha256',
      hash: 'sha256-AAAA',
      enforceIntegrity: true,
    });
    expect(getSRIForUrl('https://example.com/data.json?v=1')).not.toBeNull();
    expect(getSRIForUrl('https://example.com/data.json?v=2')).toBeNull();
  });
});

describe('numeric geography security settings are validated', () => {
  it.each([
    ['TIMEOUT_MS', Infinity],
    ['TIMEOUT_MS', 2 ** 31],
    ['TIMEOUT_MS', 0],
    ['TIMEOUT_MS', 1.5],
    ['MAX_RESPONSE_SIZE', NaN],
    ['MAX_RESPONSE_SIZE', -1],
    ['MAX_RESPONSE_SIZE', Infinity],
  ])('rejects %s = %s', (key, value) => {
    const before = getGeographySecurityConfig();
    expect(() => configureGeographySecurity({ [key]: value })).toThrow(
      expect.objectContaining({ type: 'CONFIGURATION_ERROR' }),
    );
    expect(getGeographySecurityConfig()).toBe(before);
  });

  it('accepts the largest timer-safe timeout', () => {
    configureGeographySecurity({ TIMEOUT_MS: 2 ** 31 - 1 });
    expect(getGeographySecurityConfig().TIMEOUT_MS).toBe(2 ** 31 - 1);
  });
});

describe('fetch timeout covers DNS validation', () => {
  it.each([fetchGeographiesCache, generateSRIHash])(
    'times out a slow DNS lookup before fetching',
    async (request) => {
      vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
        lookup: () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ address: '93.184.216.34' }]), 500),
          ),
      });
      const fetchMock = okFetch();
      vi.stubGlobal('fetch', fetchMock);
      configureGeographySecurity({ TIMEOUT_MS: 20 });

      const result = request(
        `https://slow-dns-${++urlCounter}.example.com/a.json`,
      );

      await expect(result).rejects.toMatchObject({
        type: 'GEOGRAPHY_LOAD_ERROR',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('reports the configured timeout', async () => {
    vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
      lookup: () =>
        new Promise((resolve) =>
          setTimeout(() => resolve([{ address: '93.184.216.34' }]), 500),
        ),
    });
    vi.stubGlobal('fetch', okFetch());
    configureGeographySecurity({ TIMEOUT_MS: 20 });

    await expect(
      fetchGeographiesCache(
        `https://slow-dns-${++urlCounter}.example.com/a.json`,
      ),
    ).rejects.toThrow(/Request timeout after 20ms/);
  });
});

describe('custom SRI entries honour enforceIntegrity: false', () => {
  it('does not enforce a disabled custom entry', async () => {
    const { addCustomSRI, fetchGeographiesCache, getSRIForUrl } =
      await freshFetchModules();
    const url = uniqueUrl('custom-sri');
    addCustomSRI(url, {
      algorithm: 'sha256',
      hash: 'sha256-AAAA',
      enforceIntegrity: false,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(featureCollection, { headers: jsonHeaders }),
      ),
    );

    expect(getSRIForUrl(url)).toBeNull();
    await expect(fetchGeographiesCache(url)).resolves.toBeDefined();
  });

  it('keeps known-source enforcement when a custom entry is disabled', async () => {
    const { addCustomSRI, getSRIForUrl } = await freshFetchModules();
    const url = 'https://unpkg.com/world-atlas@2/countries-110m.json';
    addCustomSRI(url, {
      algorithm: 'sha256',
      hash: 'sha256-AAAA',
      enforceIntegrity: false,
    });
    expect(getSRIForUrl(url)?.algorithm).toBe('sha384');
  });
});

describe('geography data validation errors keep their type and URL', () => {
  it.each([
    '{"type":"Point"}',
    '{"type":"Topology","objects":null}',
    '{"type":"FeatureCollection"}',
  ])('reports %s as a VALIDATION_ERROR with the URL', async (body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { headers: jsonHeaders })),
    );
    const url = uniqueUrl('invalid-data');

    await expect(fetchGeographiesCache(url)).rejects.toMatchObject({
      type: 'VALIDATION_ERROR',
      geography: url,
    });
  });

  it('still reports malformed JSON as a GEOGRAPHY_PARSE_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{', { headers: jsonHeaders })),
    );
    const url = uniqueUrl('bad-json');

    await expect(fetchGeographiesCache(url)).rejects.toMatchObject({
      type: 'GEOGRAPHY_PARSE_ERROR',
      geography: url,
    });
  });
});
