import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateGeographyUrl,
  configureGeographySecurity,
  DEFAULT_GEOGRAPHY_FETCH_CONFIG,
} from '../src/utils/geography-validation';
import {
  getSRIForUrl,
  configureSRI,
  DEFAULT_SRI_CONFIG,
  KNOWN_GEOGRAPHY_SRI,
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

  beforeEach(() => {
    configureGeographySecurity({ ...DEFAULT_GEOGRAPHY_FETCH_CONFIG });
    // Suppress console.warn noise — the preloader logs caught validation errors
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('preloadGeography should not throw for invalid URLs (silently skips)', async () => {
    const { preloadGeography } = await import('../src/utils/preloading');

    // These should not throw — errors are caught internally
    expect(() =>
      preloadGeography('http://evil.example.com/data.json'),
    ).not.toThrow();
    expect(() => preloadGeography('https://[::1]/data.json')).not.toThrow();
    expect(() => preloadGeography('')).not.toThrow();

    // Verify that validation errors were logged (not silently ignored)
    expect(warnSpy).toHaveBeenCalledTimes(2);
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
});
