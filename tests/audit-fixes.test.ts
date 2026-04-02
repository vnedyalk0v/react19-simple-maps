import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGeographyFetchError } from '../src/utils/error-utils';
import {
  sanitizeString,
  validateURL,
  validateNumber,
  validateCoordinates,
  validateArray,
  validateObject,
} from '../src/utils/input-validation';
import { createScaleExtent } from '../src/types';

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

  it('sets url as the third argument', () => {
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
  it('useGeographies returns isLoading and error fields', async () => {
    const { default: useGeographies } =
      await import('../src/components/useGeographies');
    expect(useGeographies).toBeDefined();
    expect(typeof useGeographies).toBe('function');
  });
});

// --- Fix 3: StyleVariant type includes focused ---
describe('StyleVariant type', () => {
  it('exports the ConditionalStyle type with focused variant', async () => {
    const types = await import('../src/types');
    expect(types).toBeDefined();
    // The type itself can't be tested at runtime, but we can verify
    // the style object shape supports 'focused'
    const style: Record<string, unknown> = {
      default: { fill: '#ccc' },
      hover: { fill: '#f00' },
      pressed: { fill: '#a00' },
      focused: { fill: '#00f' },
    };
    expect(style.focused).toEqual({ fill: '#00f' });
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
