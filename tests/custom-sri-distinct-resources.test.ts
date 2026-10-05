// @vitest-environment node
import { webcrypto } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import type { SRIConfig } from '../src/utils/index';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it.each([
  ['addCustomSRI', '', '/'],
  ['configureSRI', '', '/'],
  ['addCustomSRI', '@v', '%40v'],
  ['configureSRI', '@v', '%40v'],
  ['addCustomSRI', '/v', '%2Fv'],
  ['configureSRI', '/v', '%2Fv'],
  ['addCustomSRI', '?name=+', '?name=%2B'],
  ['configureSRI', '?name=+', '?name=%2B'],
  ['addCustomSRI', '?a=1&b=2', '?b=2&a=1'],
  ['configureSRI', '?a=1&b=2', '?b=2&a=1'],
  ['addCustomSRI', '?name=a', '?name=b'],
  ['configureSRI', '?name=a', '?name=b'],
] as const)(
  '%s retains independent policies for path suffixes %s and %s',
  async (configure, firstSuffix, secondSuffix) => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'test');
    const {
      addCustomSRI,
      DEFAULT_SRI_CONFIG,
      configureSRI,
      fetchGeographiesCache,
      getSRIForUrl,
    } = await import('../src/utils/index');
    configureSRI(DEFAULT_SRI_CONFIG);
    vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
      lookup: async () => [{ address: '8.8.8.8' }],
    });
    vi.stubGlobal('crypto', webcrypto);
    const url = 'https://8.8.8.8/data';
    const bodies = [
      JSON.stringify({ type: 'FeatureCollection', features: [] }),
      JSON.stringify({
        type: 'FeatureCollection',
        features: [],
        name: 'directory',
      }),
    ];
    const customSRIMap: Record<string, SRIConfig> = {};
    for (const [index, body] of bodies.entries()) {
      const digest = await webcrypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(body),
      );
      customSRIMap[url + (index ? secondSuffix : firstSuffix)] = {
        algorithm: 'sha256',
        hash: `sha256-${Buffer.from(digest).toString('base64')}`,
        enforceIntegrity: true,
      };
    }
    if (configure === 'configureSRI') configureSRI({ customSRIMap });
    else
      for (const [source, policy] of Object.entries(customSRIMap))
        addCustomSRI(source, policy);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (input: string) =>
          new Response(bodies[input === url + secondSuffix ? 1 : 0], {
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    expect(
      getSRIForUrl('https://unpkg.com/world-atlas@2/countries-110m.json/'),
    ).toMatchObject({ algorithm: 'sha384' });
    expect(
      getSRIForUrl('https://unpkg.com/world-atlas%402/countries-110m.json'),
    ).toMatchObject({ algorithm: 'sha384' });
    await expect(fetchGeographiesCache(url + firstSuffix)).resolves.toEqual(
      JSON.parse(bodies[0]!),
    );
    await expect(fetchGeographiesCache(url + secondSuffix)).resolves.toEqual(
      JSON.parse(bodies[1]!),
    );
  },
);
