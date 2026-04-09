import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  validateGeographyUrl,
  validateResolvedGeographyUrl,
  validateContentType,
  configureGeographySecurity,
  getGeographySecurityConfig,
  DEFAULT_GEOGRAPHY_FETCH_CONFIG,
} from '../src/utils/geography-validation';
import {
  getSRIForUrl,
  getSRIConfig,
  configureSRI,
  addCustomSRI,
  disableSRI,
  generateSRIHash,
  DEFAULT_SRI_CONFIG,
} from '../src/utils/subresource-integrity';

// ---------------------------------------------------------------------------
// SEC-001: IPv6 private IP bypass
// ---------------------------------------------------------------------------
describe('SEC-001: IPv6 private IP address validation', () => {
  beforeEach(() => {
    // Reset to default (strict HTTPS-only) config
    configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
  });

  it('should block bracketed IPv6 loopback [::1]', () => {
    expect(() => validateGeographyUrl('https://[::1]/data.json')).toThrow(
      /private IP address|not allowed/i,
    );
  });

  it('should block IPv6 link-local addresses [fe80::]', () => {
    expect(() => validateGeographyUrl('https://[fe80::1]/data.json')).toThrow(
      /private IP address|not allowed/i,
    );
  });

  it('should block IPv6 unique-local addresses [fc00::]', () => {
    expect(() => validateGeographyUrl('https://[fc00::1]/data.json')).toThrow(
      /private IP address|not allowed/i,
    );
  });

  it('should block IPv6 unique-local addresses [fd00::]', () => {
    expect(() =>
      validateGeographyUrl('https://[fd12::abcd]/data.json'),
    ).toThrow(/private IP address|not allowed/i);
  });

  it('should block IPv4-mapped IPv6 loopback [::ffff:127.0.0.1]', () => {
    // new URL normalises ::ffff:127.0.0.1 → ::ffff:7f00:1 (hex form)
    expect(() =>
      validateGeographyUrl('https://[::ffff:127.0.0.1]/data.json'),
    ).toThrow(/private IP address|not allowed/i);
  });

  it('should block IPv4-mapped IPv6 private [::ffff:10.0.0.1]', () => {
    expect(() =>
      validateGeographyUrl('https://[::ffff:10.0.0.1]/data.json'),
    ).toThrow(/private IP address|not allowed/i);
  });

  it('should block IPv4-mapped IPv6 private [::ffff:192.168.1.1]', () => {
    expect(() =>
      validateGeographyUrl('https://[::ffff:192.168.1.1]/data.json'),
    ).toThrow(/private IP address|not allowed/i);
  });

  it('should block IPv6 documentation range [2001:db8::]', () => {
    expect(() =>
      validateGeographyUrl('https://[2001:db8::1]/data.json'),
    ).toThrow(/private IP address|not allowed/i);
  });

  it('should still block IPv4 private ranges', () => {
    expect(() => validateGeographyUrl('https://10.0.0.1/data.json')).toThrow(
      /private IP address/i,
    );
    expect(() => validateGeographyUrl('https://172.16.0.1/data.json')).toThrow(
      /private IP address/i,
    );
    expect(() => validateGeographyUrl('https://192.168.1.1/data.json')).toThrow(
      /private IP address/i,
    );
    expect(() => validateGeographyUrl('https://127.0.0.1/data.json')).toThrow(
      /private IP address|Localhost|not allowed/i,
    );
  });

  it('should block Teredo addresses [2001:0000::]', () => {
    expect(() =>
      validateGeographyUrl('https://[2001:0000::1]/data.json'),
    ).toThrow(/private IP address|not allowed/i);
    expect(() =>
      validateGeographyUrl('https://[2001:0:abcd::1]/data.json'),
    ).toThrow(/private IP address|not allowed/i);
  });

  it('should NOT block legitimate public 2001: addresses outside Teredo /32', () => {
    // 2001:4860:: is Google public DNS IPv6 — must not be blocked
    expect(() =>
      validateGeographyUrl('https://[2001:4860:4860::8888]/data.json'),
    ).not.toThrow();
    // 2001:0200:: is APNIC — must not be blocked
    expect(() =>
      validateGeographyUrl('https://[2001:0200::1]/data.json'),
    ).not.toThrow();
  });

  it('should allow valid public HTTPS URLs', () => {
    expect(() =>
      validateGeographyUrl(
        'https://unpkg.com/world-atlas@2/countries-110m.json',
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// SEC-002: Preloading bypasses URL validation
// (Tested indirectly — preloadGeography imports validateGeographyUrl, so
//  providing a disallowed URL should cause the preload to be silently skipped
//  without triggering network calls.)
// ---------------------------------------------------------------------------
describe('SEC-002: Preloading validates URLs before network activity', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let preloadGeography: (url: string, immediate?: boolean) => void;

  beforeAll(async () => {
    const mod = await import('../src/utils/preloading');
    preloadGeography = mod.preloadGeography;
  });

  beforeEach(() => {
    configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
    // Suppress console.warn noise — the preloader logs caught validation errors
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('preloadGeography should not throw for invalid URLs (silently skips)', () => {
    // These should not throw — errors are caught internally
    expect(() =>
      preloadGeography('http://evil.example.com/data.json'),
    ).not.toThrow(); // → warn (HTTP not allowed)
    expect(() => preloadGeography('https://[::1]/data.json')).not.toThrow(); // → warn (private IP)
    // Empty string is rejected by the guard clause before any network/validation
    // activity, so it returns silently without logging a warning.
    expect(() => preloadGeography('')).not.toThrow(); // → no warn (early return)

    // Only the two URLs that reach validateGeographyUrl and fail produce warnings
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// SEC-002b: preloadGeographyAssets validates d3Scripts / stylesheets URLs
// ---------------------------------------------------------------------------
describe('SEC-002b: preloadGeographyAssets validates asset URLs', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let validatePreloadUrl: (url: string) => boolean;
  let preloadGeographyAssets: (options?: {
    d3Scripts?: string[];
    stylesheets?: string[];
  }) => void;

  beforeAll(async () => {
    const mod = await import('../src/utils/preloading');
    validatePreloadUrl = mod.validatePreloadUrl;
    preloadGeographyAssets = mod.preloadGeographyAssets;
  });

  beforeEach(() => {
    configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('validatePreloadUrl returns true for valid HTTPS URLs', () => {
    expect(validatePreloadUrl('https://cdn.jsdelivr.net/npm/d3@7/+esm')).toBe(
      true,
    );
    expect(validatePreloadUrl('https://unpkg.com/d3@7/dist/d3.min.js')).toBe(
      true,
    );
  });

  it('validatePreloadUrl rejects HTTP URLs', () => {
    expect(validatePreloadUrl('http://evil.example.com/script.js')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Preload URL rejected'),
    );
  });

  it('validatePreloadUrl rejects private IP addresses', () => {
    expect(validatePreloadUrl('https://10.0.0.1/style.css')).toBe(false);
    expect(validatePreloadUrl('https://192.168.1.1/script.js')).toBe(false);
    expect(validatePreloadUrl('https://[::1]/style.css')).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  it('validatePreloadUrl rejects empty and non-string values', () => {
    expect(validatePreloadUrl('')).toBe(false);
    expect(validatePreloadUrl('   ')).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validatePreloadUrl(null as any)).toBe(false);
  });

  it('preloadGeographyAssets skips invalid d3Script URLs without throwing', () => {
    expect(() =>
      preloadGeographyAssets({
        d3Scripts: [
          'http://evil.example.com/d3.js', // HTTP — rejected
          'https://10.0.0.1/d3.js', // private IP — rejected
          'https://cdn.jsdelivr.net/npm/d3@7/+esm', // valid — accepted
        ],
      }),
    ).not.toThrow();
    // Two rejections → two warnings
    const rejectWarnings = warnSpy.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' && args[0].includes('Preload URL rejected'),
    );
    expect(rejectWarnings.length).toBe(2);
  });

  it('preloadGeographyAssets skips invalid stylesheet URLs without throwing', () => {
    expect(() =>
      preloadGeographyAssets({
        stylesheets: [
          'http://evil.example.com/map.css', // HTTP — rejected
          'https://cdn.example.com/map.css', // valid — accepted
        ],
      }),
    ).not.toThrow();
    const rejectWarnings = warnSpy.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' && args[0].includes('Preload URL rejected'),
    );
    expect(rejectWarnings.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SEC-003: SRI lookup bypass via URL canonicalization
// ---------------------------------------------------------------------------
describe('SEC-003: SRI URL canonicalization', () => {
  beforeEach(() => {
    configureSRI({ ...DEFAULT_SRI_CONFIG });
  });

  it('should find SRI for exact known URL', () => {
    const url = 'https://unpkg.com/world-atlas@2/countries-110m.json';
    const result = getSRIForUrl(url);
    expect(result).not.toBeNull();
    expect(result?.enforceIntegrity).toBe(true);
  });

  it('should find SRI for a pinned unpkg world-atlas URL', () => {
    const url = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';
    const result = getSRIForUrl(url);
    expect(result).not.toBeNull();
    expect(result?.enforceIntegrity).toBe(true);
  });

  it('should find SRI for known URL with trailing fragment', () => {
    const url = 'https://unpkg.com/world-atlas@2/countries-110m.json#ignored';
    const result = getSRIForUrl(url);
    expect(result).not.toBeNull();
    expect(result?.enforceIntegrity).toBe(true);
  });

  it('should find SRI for known URL with default port', () => {
    const url = 'https://unpkg.com:443/world-atlas@2/countries-110m.json';
    const result = getSRIForUrl(url);
    expect(result).not.toBeNull();
    expect(result?.enforceIntegrity).toBe(true);
  });

  it('should return null for unknown URLs when allowUnknownSources is true', () => {
    const result = getSRIForUrl('https://example.com/unknown.json');
    expect(result).toBeNull();
  });

  it('should throw for unknown URLs when strict SRI is enforced', () => {
    configureSRI({
      enforceForKnownSources: true,
      enforceForAllSources: true,
      allowUnknownSources: false,
      customSRIMap: {},
    });

    expect(() => getSRIForUrl('https://example.com/unknown.json')).toThrow(
      /SRI enforcement/i,
    );
  });

  it('preserves custom SRI entries across partial config updates', () => {
    addCustomSRI('https://example.com/custom.json', {
      algorithm: 'sha384',
      hash: 'sha384-customhash',
      enforceIntegrity: true,
    });

    configureSRI({ enforceForAllSources: true });

    expect(getSRIForUrl('https://example.com/custom.json')).toEqual({
      algorithm: 'sha384',
      hash: 'sha384-customhash',
      enforceIntegrity: true,
    });
  });
});

// ---------------------------------------------------------------------------
// SEC-004: Resolved hostname validation blocks private-address DNS targets
// ---------------------------------------------------------------------------
describe('SEC-004: resolved hostname validation', () => {
  beforeEach(() => {
    configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
  });

  it('should block hostnames that resolve to private IP addresses', async () => {
    await expect(
      validateResolvedGeographyUrl(
        'https://example.com/data.json',
        getGeographySecurityConfig(),
        async () => ['127.0.0.1'],
      ),
    ).rejects.toThrow(/resolves to a private IP address/i);
  });

  it('should allow hostnames that resolve only to public IP addresses', async () => {
    await expect(
      validateResolvedGeographyUrl(
        'https://example.com/data.json',
        getGeographySecurityConfig(),
        async () => ['93.184.216.34'],
      ),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SEC-005: Production config hardening should not allow weaker global settings
// ---------------------------------------------------------------------------
describe('SEC-005: production security config hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
    configureSRI({ ...DEFAULT_SRI_CONFIG });
  });

  it('keeps HTTPS-only geography fetching in production', () => {
    process.env.NODE_ENV = 'production';

    configureGeographySecurity({
      STRICT_HTTPS_ONLY: false,
      ALLOW_HTTP_LOCALHOST: true,
      ALLOWED_PROTOCOLS: ['https:', 'http:'],
    });

    const config = getGeographySecurityConfig();
    expect(config.STRICT_HTTPS_ONLY).toBe(true);
    expect(config.ALLOW_HTTP_LOCALHOST).toBe(false);
    expect(config.ALLOWED_PROTOCOLS).toEqual(['https:']);
  });

  it('preserves custom geography limits when enabling development mode', async () => {
    process.env.NODE_ENV = 'development';
    const { enableDevelopmentMode } =
      await import('../src/utils/geography-validation');

    configureGeographySecurity({
      TIMEOUT_MS: 5000,
      MAX_RESPONSE_SIZE: 10 * 1024 * 1024,
    });
    enableDevelopmentMode(true);

    const config = getGeographySecurityConfig();
    expect(config.TIMEOUT_MS).toBe(5000);
    expect(config.MAX_RESPONSE_SIZE).toBe(10 * 1024 * 1024);
    expect(config.ALLOW_HTTP_LOCALHOST).toBe(true);
    expect(config.STRICT_HTTPS_ONLY).toBe(false);
    expect(config.ALLOWED_PROTOCOLS).toEqual(['https:', 'http:']);
  });

  it('merges partial geography security updates with the existing config', () => {
    configureGeographySecurity({
      TIMEOUT_MS: 5000,
      MAX_RESPONSE_SIZE: 10 * 1024 * 1024,
    });
    configureGeographySecurity({ ALLOW_HTTP_LOCALHOST: true });

    const config = getGeographySecurityConfig();
    expect(config.TIMEOUT_MS).toBe(5000);
    expect(config.MAX_RESPONSE_SIZE).toBe(10 * 1024 * 1024);
    expect(config.ALLOW_HTTP_LOCALHOST).toBe(true);
  });

  it('does not disable known-source SRI enforcement in production', () => {
    process.env.NODE_ENV = 'production';

    disableSRI();

    expect(getSRIConfig().enforceForKnownSources).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SEC-003b: exported SRI hash generation validates URLs first
// ---------------------------------------------------------------------------
describe('SEC-003b: exported SRI hash generation validates URLs first', () => {
  beforeEach(() => {
    configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
  });

  it('rejects blocked URLs before issuing a fetch request', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'));

    await expect(
      generateSRIHash('https://127.0.0.1/private.json'),
    ).rejects.toThrow(/private IP address|not allowed/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('enforces the configured response size limit when generating an SRI hash', async () => {
    configureGeographySecurity({
      STRICT_HTTPS_ONLY: false,
      ALLOW_HTTP_LOCALHOST: true,
      ALLOWED_PROTOCOLS: ['https:', 'http:'],
      MAX_RESPONSE_SIZE: 4,
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4, 5]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(generateSRIHash('http://localhost/data.json')).rejects.toThrow(
      /Response too large/i,
    );
  });
});

// ---------------------------------------------------------------------------
// SEC-006: Content-Type validation should match exact MIME types
// ---------------------------------------------------------------------------
describe('SEC-006: strict content-type validation', () => {
  it('accepts valid JSON content types with parameters', () => {
    const response = new Response('{}', {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });

    expect(() => validateContentType(response)).not.toThrow();
  });

  it('rejects misleading content types that only contain JSON as a substring', () => {
    const response = new Response('{}', {
      headers: { 'content-type': 'text/plain application/json' },
    });

    expect(() => validateContentType(response)).toThrow(
      /Invalid content type/i,
    );
  });
});
