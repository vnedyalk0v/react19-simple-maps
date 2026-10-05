// @vitest-environment node
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sourceUrl = 'https://8.8.8.8/geography.json';
const targetUrl = 'https://1.1.1.1/final.json';
const knownUrl = 'https://unpkg.com/world-atlas@2/countries-110m.json';
const data = JSON.stringify({ type: 'FeatureCollection', features: [] });
const jsonHeaders = { 'content-type': 'application/json' };

let fetching: typeof import('../src/utils/geography-fetching');
let sri: typeof import('../src/utils/subresource-integrity');

beforeEach(async () => {
  vi.resetModules();
  [fetching, sri] = await Promise.all([
    import('../src/utils/geography-fetching'),
    import('../src/utils/subresource-integrity'),
  ]);
  vi.stubGlobal('crypto', webcrypto);
  vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
    lookup: async () => [{ address: '8.8.8.8' }],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

async function integrity(content = data) {
  const digest = await webcrypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(content),
  );
  return {
    algorithm: 'sha256' as const,
    hash: `sha256-${Buffer.from(digest).toString('base64')}`,
    enforceIntegrity: true,
  };
}

function mockResponses(...responses: Response[]) {
  const fetchMock = vi.fn(async () => responses.shift()!);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('geography redirect integrity', () => {
  it('enforces known-source integrity when an unknown URL redirects to it', async () => {
    mockResponses(
      redirect(knownUrl),
      new Response(data, { headers: jsonHeaders }),
    );
    await expect(
      fetching.fetchGeographiesCache(sourceUrl),
    ).rejects.toMatchObject({
      type: 'SECURITY_ERROR',
    });
  });

  it('retains known-source integrity across an intermediate redirect hop', async () => {
    mockResponses(
      redirect(knownUrl),
      redirect(targetUrl),
      new Response(data, { headers: jsonHeaders }),
    );
    await expect(
      fetching.fetchGeographiesCache(sourceUrl),
    ).rejects.toMatchObject({
      type: 'SECURITY_ERROR',
    });
  });

  it('uses the validated redirect URL rather than Response.url for target integrity', async () => {
    sri.addCustomSRI(targetUrl, await integrity('different bytes'));
    const response = new Response(data, { headers: jsonHeaders });
    Object.defineProperty(response, 'url', { value: sourceUrl });
    mockResponses(redirect(targetUrl), response);
    await expect(
      fetching.fetchGeographiesCache(sourceUrl),
    ).rejects.toMatchObject({
      type: 'SECURITY_ERROR',
    });
  });

  it('preserves the original custom integrity requirement after a redirect', async () => {
    sri.addCustomSRI(sourceUrl, await integrity('different bytes'));
    sri.addCustomSRI(targetUrl, await integrity());
    mockResponses(
      redirect(targetUrl),
      new Response(data, { headers: jsonHeaders }),
    );
    await expect(
      fetching.fetchGeographiesCache(sourceUrl),
    ).rejects.toMatchObject({
      type: 'SECURITY_ERROR',
    });
  });

  it('accepts redirected bytes satisfying both original and target integrity', async () => {
    sri.addCustomSRI(sourceUrl, await integrity());
    sri.addCustomSRI(targetUrl, await integrity());
    mockResponses(
      redirect(targetUrl),
      new Response(data, { headers: jsonHeaders }),
    );
    await expect(fetching.fetchGeographiesCache(sourceUrl)).resolves.toEqual(
      JSON.parse(data),
    );
  });

  it('allows a strict-mode pinned alias to redirect to an unpinned target', async () => {
    sri.addCustomSRI(sourceUrl, await integrity());
    sri.enableStrictSRI();
    mockResponses(
      redirect(targetUrl),
      new Response(data, { headers: jsonHeaders }),
    );
    await expect(fetching.fetchGeographiesCache(sourceUrl)).resolves.toEqual(
      JSON.parse(data),
    );
  });

  it('rejects an unpinned original URL in strict mode before fetching', async () => {
    sri.enableStrictSRI();
    const fetchMock = mockResponses(redirect(knownUrl));
    await expect(
      fetching.fetchGeographiesCache(sourceUrl),
    ).rejects.toMatchObject({
      type: 'SECURITY_ERROR',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the SRI configuration captured when the request starts', async () => {
    let release!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              release = resolve;
            }),
        )
        .mockResolvedValueOnce(new Response(data, { headers: jsonHeaders })),
    );
    const request = fetching.fetchGeographiesCache(sourceUrl);
    await vi.waitFor(() => expect(release).toBeDefined());
    sri.configureSRI({ enforceForKnownSources: false });
    release(redirect(knownUrl));
    await expect(request).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
  });

  it('honors explicit known-source SRI opt-out for a redirected target', async () => {
    sri.configureSRI({ enforceForKnownSources: false });
    mockResponses(
      redirect(knownUrl),
      new Response(data, { headers: jsonHeaders }),
    );
    await expect(fetching.fetchGeographiesCache(sourceUrl)).resolves.toEqual(
      JSON.parse(data),
    );
  });
});
