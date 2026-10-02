// @vitest-environment node
import { createServer } from 'node:http';
import { once } from 'node:events';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchGeographiesCache } from '../src/utils/geography-fetching';
import {
  generateSRIHash,
  configureSRI,
  DEFAULT_SRI_CONFIG,
} from '../src/utils/subresource-integrity';
import {
  configureGeographySecurity,
  DEFAULT_GEOGRAPHY_FETCH_CONFIG,
  DEVELOPMENT_GEOGRAPHY_FETCH_CONFIG,
} from '../src/utils/geography-validation';

const url = 'https://8.8.8.8/geography.json';
const data = JSON.stringify({ type: 'FeatureCollection', features: [] });

beforeEach(() => {
  configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
  configureSRI({ ...DEFAULT_SRI_CONFIG });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
});

describe('validated geography transport', () => {
  it.each([fetchGeographiesCache, generateSRIHash])(
    'allows five redirects and cancels each unused body',
    async (request) => {
      vi.stubGlobal('crypto', webcrypto);
      const redirects = Array.from(
        { length: 5 },
        (_, index) =>
          new Response('unused', {
            status: 302,
            headers: { location: `/hop-${index + 1}.json` },
          }),
      );
      const cancels = redirects.map((response) =>
        vi.spyOn(response.body!, 'cancel'),
      );
      const responses = [
        ...redirects,
        new Response(data, { headers: { 'content-type': 'application/json' } }),
      ];
      const fetchMock = vi.fn(async (_url: string) => responses.shift()!);
      vi.stubGlobal('fetch', fetchMock);
      await expect(request(url)).resolves.toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(6);
      expect(fetchMock.mock.calls[5]?.[0]).toBe('https://8.8.8.8/hop-5.json');
      for (const cancel of cancels) expect(cancel).toHaveBeenCalledTimes(1);
    },
  );

  it.each([fetchGeographiesCache, generateSRIHash])(
    'rejects a sixth redirect without a seventh fetch and cancels its body',
    async (request) => {
      const redirects = Array.from(
        { length: 6 },
        (_, index) =>
          new Response('unused', {
            status: 302,
            headers: { location: `/hop-${index + 1}.json` },
          }),
      );
      const cancels = redirects.map((response) =>
        vi.spyOn(response.body!, 'cancel'),
      );
      const fetchMock = vi.fn(async () => redirects.shift()!);
      vi.stubGlobal('fetch', fetchMock);
      const result = request(url);
      await expect(result).rejects.toThrow(/exceeded 5 hops/i);
      await expect(result).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
      expect(fetchMock).toHaveBeenCalledTimes(6);
      for (const cancel of cancels) expect(cancel).toHaveBeenCalledTimes(1);
    },
  );

  it.each([fetchGeographiesCache, generateSRIHash])(
    'uses only CORS-safelisted request headers by default',
    async (request) => {
      vi.stubGlobal('crypto', webcrypto);
      const fetchMock = vi.fn(
        async (_url: string, _options: RequestInit) =>
          new Response(data, {
            headers: { 'content-type': 'application/json' },
          }),
      );
      vi.stubGlobal('fetch', fetchMock);
      await request(url);
      const options = fetchMock.mock.calls[0]![1];
      const headers = new Headers(options.headers);
      expect([...headers.keys()]).toEqual(['accept']);
      expect(headers.get('accept')).toBe(
        DEFAULT_GEOGRAPHY_FETCH_CONFIG.ALLOWED_CONTENT_TYPES.join(', '),
      );
      expect(options).toMatchObject({
        mode: 'cors',
        credentials: 'omit',
        redirect: 'manual',
      });
    },
  );
  it.each([fetchGeographiesCache, generateSRIHash])(
    'rejects private redirect targets without following them',
    async (request) => {
      const response = new Response('x'.repeat(4096), {
        status: 302,
        headers: { location: 'https://127.0.0.1/private.json' },
      });
      const arrayBuffer = vi.spyOn(response, 'arrayBuffer');
      const cancel = vi.spyOn(response.body!, 'cancel');
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal('fetch', fetchMock);
      configureGeographySecurity({ MAX_RESPONSE_SIZE: 64 });
      const result = request(url);
      await expect(result).rejects.toThrow(/private|not allowed/i);
      await expect(result).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1]).toMatchObject({
        redirect: 'manual',
        credentials: 'omit',
      });
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(arrayBuffer).not.toHaveBeenCalled();
    },
  );

  it.each([fetchGeographiesCache, generateSRIHash])(
    'validates redirected hostnames against DNS results',
    async (request) => {
      const lookup = vi.fn(async (hostname: string) => [
        {
          address:
            hostname === 'redirect.example.test' ? '127.0.0.1' : '8.8.8.8',
        },
      ]);
      vi.spyOn(process, 'getBuiltinModule').mockReturnValue({ lookup });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('', {
          status: 302,
          headers: { location: 'https://redirect.example.test/final.json' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);
      const result = request(url);
      await expect(result).rejects.toThrow(/resolves to a private IP/i);
      await expect(result).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(lookup).toHaveBeenCalledWith('redirect.example.test', {
        all: true,
        verbatim: true,
      });
    },
  );

  it('enforces the body size limit while generating a hash', async () => {
    configureGeographySecurity({ MAX_RESPONSE_SIZE: 64 });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('x'.repeat(65))),
    );
    await expect(generateSRIHash(url)).rejects.toThrow(/too large/i);
  });

  it('cancels a large redirect body and follows a valid relative hop', async () => {
    const redirect = new Response('x'.repeat(4096), {
      status: 302,
      headers: { location: '/final.json' },
    });
    const buffer = vi.spyOn(redirect, 'arrayBuffer');
    const cancel = vi.spyOn(redirect.body!, 'cancel');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect)
      .mockResolvedValueOnce(
        new Response(data, { headers: { 'content-type': 'application/json' } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    configureGeographySecurity({ MAX_RESPONSE_SIZE: 64 });
    await expect(fetchGeographiesCache(url)).resolves.toEqual(JSON.parse(data));
    expect(fetchMock.mock.calls[1][0]).toBe('https://8.8.8.8/final.json');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(buffer).not.toHaveBeenCalled();
  });

  it('preserves redirect validation errors when cancellation fails', async () => {
    const redirect = new Response('', {
      status: 302,
      headers: { location: 'http://8.8.8.8/private.json' },
    });
    vi.spyOn(redirect.body!, 'cancel').mockRejectedValue(
      new Error('cancel failed'),
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirect));
    await expect(fetchGeographiesCache(url)).rejects.toThrow(/HTTPS/i);
  });

  it.each([fetchGeographiesCache, generateSRIHash])(
    'rejects browser opaque redirects explicitly',
    async (request) => {
      const response = new Response(null);
      Object.defineProperty(response, 'type', { value: 'opaqueredirect' });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      const result = request(url);
      await expect(result).rejects.toThrow(
        /opaque redirect.*final resource URL/i,
      );
      await expect(result).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
    },
  );

  it('classifies ordinary hash-generation network failures as load errors', async () => {
    const failure = new TypeError('fetch failed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure));
    await expect(generateSRIHash(url)).rejects.toMatchObject({
      type: 'GEOGRAPHY_LOAD_ERROR',
      cause: failure,
    });
  });

  it('hashes a validated public redirect using the existing body size limit', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 301,
          headers: { location: 'https://1.1.1.1/final.json' },
        }),
      )
      .mockResolvedValueOnce(new Response(data));
    vi.stubGlobal('fetch', fetchMock);
    const digest = await webcrypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(data),
    );
    await expect(generateSRIHash(url, 'sha256')).resolves.toBe(
      `sha256-${Buffer.from(digest).toString('base64')}`,
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      redirect: 'manual',
      credentials: 'omit',
    });
  });

  it.each([fetchGeographiesCache, generateSRIHash])(
    'aborts a stalled body after response headers have arrived',
    async (request) => {
      configureGeographySecurity({
        ...DEVELOPMENT_GEOGRAPHY_FETCH_CONFIG,
        TIMEOUT_MS: 40,
      });
      const server = createServer((_req, response) => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.flushHeaders();
        response.write('{');
      });
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Missing server port');
      try {
        await expect(
          request(`http://localhost:${address.port}/data.json`),
        ).rejects.toThrow(/timeout|abort/i);
      } finally {
        server.closeAllConnections();
        server.close();
        await once(server, 'close');
      }
    },
  );

  it.each(['success', 'error'])('clears the timeout on %s', async (result) => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, options: RequestInit) => {
        signal = options.signal ?? undefined;
        return result === 'success'
          ? Promise.resolve(
              new Response(data, {
                headers: { 'content-type': 'application/json' },
              }),
            )
          : Promise.reject(new Error('fetch failed'));
      }),
    );
    const request = fetchGeographiesCache(url);
    if (result === 'success')
      await expect(request).resolves.toEqual(JSON.parse(data));
    else await expect(request).rejects.toThrow('fetch failed');
    await vi.advanceTimersByTimeAsync(10001);
    expect(signal?.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
