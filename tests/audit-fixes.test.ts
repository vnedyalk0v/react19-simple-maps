import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGeographyFetchError } from '../src/utils/error-utils';
import {
  sanitizeString,
  validateURL,
  validateNumber,
  validateCoordinates,
  validateArray,
  validateObject,
  validateProjectionConfig,
} from '../src/utils/input-validation';
import { createScaleExtent } from '../src/types';
import {
  generateFeaturesCacheKey,
  generatePreparedFeaturesCacheKey,
} from '../src/utils/geography-cache';
import { validateGeographyData } from '../src/utils';
import { getGeographyCoordinates } from '../src/utils/geography-utils';
import type { Feature, Geometry } from 'geojson';

// --- Fix 5: Validation helpers argument order ---
describe('Validation error messages (finding 6.1)', () => {
  it('sanitizeString includes the actual error message, not the error type', () => {
    try {
      sanitizeString(42);
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error & { type: string };
      expect(error.message).toContain('Expected string');
      expect(error.message).not.toBe('VALIDATION_ERROR');
      expect(error.type).toBe('VALIDATION_ERROR');
    }
  });

  it('validateNumber includes the descriptive message', () => {
    try {
      validateNumber('not a number');
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error & { type: string };
      expect(error.message).toContain('Expected number');
      expect(error.type).toBe('VALIDATION_ERROR');
    }
  });

  it('validateNumber range error includes the value and range', () => {
    try {
      validateNumber(100, 0, 50);
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error & { type: string };
      expect(error.message).toContain('100');
      expect(error.message).toContain('[0, 50]');
    }
  });

  it('validateCoordinates error includes the actual cause', () => {
    try {
      validateCoordinates('not an array');
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error & { type: string };
      expect(error.message).toContain('array');
    }
  });

  it('validateURL security error uses SECURITY_ERROR type for dangerous protocols', () => {
    try {
      validateURL('file:///etc/passwd');
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error & { type: string };
      expect(error.type).toBe('SECURITY_ERROR');
      expect(error.message).toContain('Dangerous protocol');
    }
  });

  it('validateURL rejects malformed input instead of sanitizing it into a different URL', () => {
    try {
      validateURL('<https://example.com>');
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error & { type: string };
      expect(error.type).toBe('VALIDATION_ERROR');
      expect(error.message).toContain('Invalid URL format');
    }
  });

  it('validateURL rejects tab, newline, and carriage return control characters', () => {
    for (const value of [
      'https://example.com/\tdata.json',
      'https://example.com/\ndata.json',
      'https://example.com/\rdata.json',
    ]) {
      try {
        validateURL(value);
        expect.fail('should have thrown');
      } catch (err) {
        const error = err as Error & { type: string };
        expect(error.type).toBe('VALIDATION_ERROR');
        expect(error.message).toContain('control characters');
      }
    }
  });

  it('validateArray includes descriptive message', () => {
    try {
      validateArray('not-an-array');
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error & { type: string };
      expect(error.message).toContain('Expected array');
    }
  });

  it('validateObject includes descriptive message', () => {
    try {
      validateObject('not-an-object');
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error & { type: string };
      expect(error.message).toContain('Expected object');
    }
  });
});

// --- createGeographyFetchError correctness ---
describe('createGeographyFetchError', () => {
  it('sets message as the second argument', () => {
    const error = createGeographyFetchError(
      'VALIDATION_ERROR',
      'Something went wrong',
    );
    expect(error.message).toBe('Something went wrong');
    expect(error.type).toBe('VALIDATION_ERROR');
  });

  it('sets geography from the third argument', () => {
    const error = createGeographyFetchError(
      'GEOGRAPHY_LOAD_ERROR',
      'Failed to load',
      'https://example.com/data.json',
    );
    expect(error.message).toBe('Failed to load');
    expect(error.geography).toBe('https://example.com/data.json');
  });
});

// --- Fix 4: scaleExtent branded type ---
describe('createScaleExtent', () => {
  it('creates a branded scale extent tuple', () => {
    const extent = createScaleExtent(2, 4);
    expect(extent[0]).toBe(2);
    expect(extent[1]).toBe(4);
  });
});

// --- Fix 1: GeographyData type includes isLoading and error ---
describe('GeographyData type shape', () => {
  it('useGeographies is exported as a function', async () => {
    const { default: useGeographies } =
      await import('../src/components/useGeographies');
    expect(useGeographies).toBeDefined();
    expect(typeof useGeographies).toBe('function');
  });
});

// --- Fix 7: Debug system ---
describe('MapDebugger singleton (finding 7.1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getInstance returns the same instance', async () => {
    const { MapDebugger } = await import('../src/utils/debugging');
    const a = MapDebugger.getInstance();
    const b = MapDebugger.getInstance();
    expect(a).toBe(b);
  });

  it('logRender does nothing when debug is disabled', async () => {
    const { MapDebugger } = await import('../src/utils/debugging');
    const debugger_ = MapDebugger.getInstance();
    debugger_.setDebugMode(false);
    debugger_.clear();

    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    debugger_.logRender('TestComponent', { test: true });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(debugger_.getAllLogs()).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it('logRender logs when debug is enabled', async () => {
    const { MapDebugger } = await import('../src/utils/debugging');
    const debugger_ = MapDebugger.getInstance();
    debugger_.setDebugMode(true);
    debugger_.clear();

    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    debugger_.logRender('TestComponent', { test: true });

    expect(consoleSpy).toHaveBeenCalled();
    expect(debugger_.getAllLogs()).toHaveLength(1);

    debugger_.setDebugMode(false);
    debugger_.clear();
    consoleSpy.mockRestore();
  });
});

describe('security hardening regressions', () => {
  it('validateObject drops dangerous prototype keys and returns a null-prototype object', () => {
    const payload = JSON.parse(
      '{"safe":"value","__proto__":{"polluted":true,"center":[1,2]}}',
    ) as Record<string, unknown>;

    const validated = validateObject(payload);

    expect(Object.getPrototypeOf(validated)).toBeNull();
    expect(Object.hasOwn(validated, 'safe')).toBe(true);
    expect(validated.safe).toBe('value');
    expect(Object.hasOwn(validated, '__proto__')).toBe(false);
    expect(Object.hasOwn(validated, 'center')).toBe(false);
    expect((validated as Record<string, unknown>).center).toBeUndefined();
  });

  it('validateProjectionConfig ignores inherited values introduced through __proto__ payloads', () => {
    const payload = JSON.parse(
      '{"__proto__":{"center":[1,2],"scale":10}}',
    ) as Record<string, unknown>;

    expect(validateProjectionConfig(payload)).toEqual({});
  });

  it('uses object identity and function identity for feature cache keys', () => {
    const first = {
      type: 'Topology',
      objects: { countries: { type: 'GeometryCollection', geometries: [] } },
      arcs: [],
      transform: { scale: [1, 1], translate: [0, 0] },
      meta: 'a',
    };
    const second = {
      type: 'Topology',
      objects: { countries: { type: 'GeometryCollection', geometries: [] } },
      arcs: [],
      transform: { scale: [1, 1], translate: [0, 0] },
      meta: 'b',
    };

    const parseOne = (features: never[]) => features;
    const parseTwo = (features: never[]) => features;

    expect(generateFeaturesCacheKey(first)).not.toBe(
      generateFeaturesCacheKey(second),
    );
    expect(generateFeaturesCacheKey(first, parseOne)).not.toBe(
      generateFeaturesCacheKey(first, parseTwo),
    );
  });

  it('uses feature array identity for prepared feature cache keys', () => {
    const makeFeature = (name: string): Feature<Geometry> => ({
      type: 'Feature',
      properties: { NAME: name },
      geometry: { type: 'Point', coordinates: [0, 0] },
    });

    const first = [makeFeature('Shared')];
    const second = [makeFeature('Shared')];
    const path = () => 'M0,0';

    expect(generatePreparedFeaturesCacheKey(first, path)).not.toBe(
      generatePreparedFeaturesCacheKey(second, path),
    );
  });

  it('returns null instead of overflowing the stack for deeply nested GeometryCollections', () => {
    const nestedGeometry = Array.from({ length: 12 }).reduce<Geometry>(
      (geometry) => ({
        type: 'GeometryCollection',
        geometries: [geometry],
      }),
      { type: 'Point', coordinates: [10, 20] },
    );

    const feature: Feature<Geometry> = {
      type: 'Feature',
      properties: {},
      geometry: nestedGeometry,
    };

    expect(getGeographyCoordinates(feature)).toBeNull();
  });

  it('rejects malformed topology and feature collection shapes', () => {
    expect(() =>
      validateGeographyData({
        type: 'Topology',
        objects: [],
      }),
    ).toThrow(/objects map/i);

    expect(() =>
      validateGeographyData({
        type: 'FeatureCollection',
        features: 'not-an-array',
      }),
    ).toThrow(/features array/i);
  });
});
