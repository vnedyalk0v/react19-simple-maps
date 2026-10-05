// @vitest-environment node
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const url = 'https://8.8.8.8/geography.json';
const data = JSON.stringify({ type: 'FeatureCollection', features: [] });
const headers = { 'content-type': 'application/json' };
let utils: typeof import('../src/utils');

beforeEach(async () => {
  vi.resetModules();
  utils = await import('../src/utils');
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(data, { headers })),
  );
  vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
    lookup: async () => [{ address: '8.8.8.8' }],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function integrity(
  content: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256',
) {
  const digest = await webcrypto.subtle.digest(
    { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' }[algorithm],
    new TextEncoder().encode(content),
  );
  return {
    algorithm,
    hash: `${algorithm}-${Buffer.from(digest).toString('base64')}`,
    enforceIntegrity: true,
  };
}

describe('public SRI configuration snapshots', () => {
  it('enforces configured integrity for equivalent URL keys', async () => {
    utils.configureSRI({
      customSRIMap: {
        [`${url}#configured`]: await integrity('different bytes'),
      },
    });
    await expect(utils.fetchGeographiesCache(url)).rejects.toMatchObject({
      type: 'SECURITY_ERROR',
    });
  });

  it('keeps queries significant when configuring custom map entries', async () => {
    utils.configureSRI({
      customSRIMap: {
        [`${url}?v=1#configured`]: await integrity('different bytes'),
      },
    });
    await expect(
      utils.fetchGeographiesCache(`${url}?v=1`),
    ).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
    await expect(utils.fetchGeographiesCache(`${url}?v=2`)).resolves.toEqual(
      JSON.parse(data),
    );
  });

  it('composes custom maps across updates and honors explicit disabled entries', async () => {
    utils.configureSRI({
      customSRIMap: { [`${url}#old`]: await integrity('different bytes') },
    });
    utils.configureSRI({
      customSRIMap: { [`${url}?v=2`]: await integrity('different bytes') },
    });
    await expect(utils.fetchGeographiesCache(url)).rejects.toMatchObject({
      type: 'SECURITY_ERROR',
    });
    await expect(
      utils.fetchGeographiesCache(`${url}?v=2`),
    ).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
    utils.configureSRI({
      customSRIMap: {
        [`${url}#new`]: {
          ...(await integrity('different bytes')),
          enforceIntegrity: false,
        },
      },
    });
    await expect(utils.fetchGeographiesCache(url)).resolves.toEqual(
      JSON.parse(data),
    );
    await expect(
      utils.fetchGeographiesCache(`${url}?v=2`),
    ).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
  });

  it.each(['configureSRI', 'addCustomSRI'] as const)(
    'copies caller-owned integrity values through %s',
    async (method) => {
      const config = await integrity('different bytes');
      if (method === 'configureSRI')
        utils.configureSRI({ customSRIMap: { [url]: config } });
      else utils.addCustomSRI(url, config);
      config.enforceIntegrity = false;
      await expect(utils.fetchGeographiesCache(url)).rejects.toMatchObject({
        type: 'SECURITY_ERROR',
      });
    },
  );

  it('retains the registered hash when caller data changes during fetching', async () => {
    const config = await integrity('different bytes');
    utils.addCustomSRI(url, config);
    let release!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      ),
    );
    const request = utils.fetchGeographiesCache(url);
    await vi.waitFor(() => expect(release).toBeDefined());
    config.hash = (await integrity(data)).hash;
    release(new Response(data, { headers }));
    await expect(request).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
  });
});

describe('SRI base64 fallback', () => {
  it.each(['sha256', 'sha384', 'sha512'] as const)(
    'generates and validates standard %s integrity without btoa',
    async (algorithm) => {
      vi.stubGlobal('btoa', undefined);
      const expected = await integrity(data, algorithm);
      await expect(utils.generateSRIHash(url, algorithm)).resolves.toBe(
        expected.hash,
      );
      await expect(
        utils.validateSRI(new Response(data), url, expected),
      ).resolves.toBeInstanceOf(Response);
    },
  );
});

describe('SRI generation failed response cleanup', () => {
  it.each(['success', 'failure'])(
    'cancels unread HTTP error bodies when cancellation ends in %s',
    async (outcome) => {
      const cancel = vi.fn(() =>
        outcome === 'failure'
          ? Promise.reject(new Error('cancel failed'))
          : undefined,
      );
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{'));
        },
        cancel,
      });
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(body, {
              status: 404,
              statusText: 'Not Found',
              headers,
            }),
        ),
      );
      await expect(utils.generateSRIHash(url)).rejects.toMatchObject({
        type: 'GEOGRAPHY_LOAD_ERROR',
        message: expect.stringContaining('Not Found'),
      });
      expect(cancel).toHaveBeenCalledTimes(1);
    },
  );
});
