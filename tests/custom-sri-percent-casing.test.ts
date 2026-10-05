// @vitest-environment node
import { webcrypto } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each([
  ['addCustomSRI', 'https://8.8.8.8/maps%2fworld.json', '%2f', '%2F'],
  ['configureSRI', 'https://8.8.8.8/maps%2fworld.json', '%2f', '%2F'],
  [
    'addCustomSRI',
    'https://8.8.8.8/world.json?name=maps%2fworld',
    '%2f',
    '%2F',
  ],
  [
    'configureSRI',
    'https://8.8.8.8/world.json?name=maps%2fworld',
    '%2f',
    '%2F',
  ],
  ['addCustomSRI', 'https://8.8.8.8/data?name=%61', '%61', 'a'],
  ['configureSRI', 'https://8.8.8.8/data?name=%61', '%61', 'a'],
] as const)(
  '%s applies integrity for equivalent percent escapes in %s (%s → %s)',
  async (configure, url, encoded, equivalent) => {
    vi.resetModules();
    const { addCustomSRI, configureSRI, fetchGeographiesCache } =
      await import('../src/utils/index');
    vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
      lookup: async () => [{ address: '8.8.8.8' }],
    });
    vi.stubGlobal('crypto', webcrypto);
    const sri = {
      algorithm: 'sha256' as const,
      hash: 'sha256-AAAA',
      enforceIntegrity: true,
    };
    if (configure === 'addCustomSRI') addCustomSRI(url, sri);
    else configureSRI({ customSRIMap: { [url]: sri } });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"type":"FeatureCollection","features":[]}', {
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    await expect(
      fetchGeographiesCache(url.replace(encoded, equivalent)),
    ).rejects.toMatchObject({ type: 'SECURITY_ERROR' });
  },
);
