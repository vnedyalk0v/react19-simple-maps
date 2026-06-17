import { createGeographyFetchError } from './error-utils';
import { createRotationAngles, createParallels } from '../types';
import type { Coordinates, ProjectionConfig } from '../types';

/**
 * Input validation configuration
 */
export interface ValidationConfig {
  strictMode: boolean;
  allowUnsafeContent: boolean;
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectDepth: number;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  strictMode: true,
  allowUnsafeContent: false,
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
};

function createValidationConfig(
  config: Partial<ValidationConfig>,
): ValidationConfig {
  const nextConfig: ValidationConfig = {
    ...DEFAULT_VALIDATION_CONFIG,
    ...config,
  };

  if (
    typeof process !== 'undefined' &&
    process?.env?.NODE_ENV === 'production' &&
    nextConfig.allowUnsafeContent
  ) {
    nextConfig.allowUnsafeContent = false;
  }

  return Object.freeze(nextConfig);
}

const currentValidationConfig: ValidationConfig = createValidationConfig({});

/**
 * Sanitize string input to prevent injection attacks
 * @param input - String to sanitize
 * @param allowHTML - Whether to allow HTML content
 * @returns Sanitized string
 */
export function sanitizeString(
  input: unknown,
  allowHTML: boolean = false,
): string {
  if (typeof input !== 'string') {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Expected string, got ${typeof input}`,
    );
  }

  // Check length limits
  if (input.length > currentValidationConfig.maxStringLength) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `String too long: ${input.length} characters (max: ${currentValidationConfig.maxStringLength})`,
    );
  }

  let sanitized = input;

  if (!allowHTML) {
    // Remove HTML tags and entities
    sanitized = sanitized
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, '') // Remove HTML entities
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:/gi, '') // Remove data: URLs
      .replace(/vbscript:/gi, ''); // Remove vbscript: URLs
  }

  // Remove null bytes and control characters (excluding common whitespace)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate and sanitize URL input
 * @param input - URL to validate
 * @returns Validated URL string
 */
export function validateURL(input: unknown): string {
  if (typeof input !== 'string') {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Expected string, got ${typeof input}`,
    );
  }

  const candidate = input.trim();
  if (!candidate) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'URL must be a non-empty string',
    );
  }

  if (candidate.length > currentValidationConfig.maxStringLength) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `String too long: ${candidate.length} characters (max: ${currentValidationConfig.maxStringLength})`,
    );
  }

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(candidate)) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'URL contains invalid control characters',
    );
  }

  try {
    const url = new URL(candidate);

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (
      dangerousProtocols.some((protocol) =>
        url.protocol.toLowerCase().startsWith(protocol),
      )
    ) {
      throw createGeographyFetchError(
        'SECURITY_ERROR',
        `Dangerous protocol detected: ${url.protocol}`,
      );
    }

    // Validate hostname
    if (url.hostname.includes('..') || url.hostname.includes('%')) {
      throw createGeographyFetchError(
        'SECURITY_ERROR',
        `Invalid hostname: ${url.hostname}`,
      );
    }

    return url.toString();
  } catch (error) {
    if (error instanceof TypeError) {
      throw createGeographyFetchError(
        'VALIDATION_ERROR',
        `Invalid URL format: ${candidate}`,
      );
    }
    throw error;
  }
}

/**
 * Validate numeric input with range checking
 * @param input - Number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validated number
 */
export function validateNumber(
  input: unknown,
  min: number = -Infinity,
  max: number = Infinity,
): number {
  if (typeof input !== 'number') {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Expected number, got ${typeof input}`,
    );
  }

  if (!Number.isFinite(input)) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'Number must be finite',
    );
  }

  if (input < min || input > max) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Number ${input} is outside allowed range [${min}, ${max}]`,
    );
  }

  return input;
}

/**
 * Validate coordinates input
 * @param input - Coordinates to validate
 * @returns Validated coordinates
 */
export function validateCoordinates(input: unknown): Coordinates {
  if (!Array.isArray(input) || input.length !== 2) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'Coordinates must be an array of exactly 2 numbers',
    );
  }

  const [lon, lat] = input;

  const validatedLon = validateNumber(lon, -180, 180);
  const validatedLat = validateNumber(lat, -90, 90);

  return [validatedLon, validatedLat] as Coordinates;
}

/**
 * Validate array input with length and content validation
 * @param input - Array to validate
 * @param itemValidator - Function to validate each item
 * @returns Validated array
 */
export function validateArray<T>(
  input: unknown,
  itemValidator?: (item: unknown, index: number) => T,
): T[] {
  if (!Array.isArray(input)) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Expected array, got ${typeof input}`,
    );
  }

  if (input.length > currentValidationConfig.maxArrayLength) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Array too long: ${input.length} items (max: ${currentValidationConfig.maxArrayLength})`,
    );
  }

  if (itemValidator) {
    return input.map((item, index) => {
      try {
        return itemValidator(item, index);
      } catch (error) {
        throw createGeographyFetchError(
          'VALIDATION_ERROR',
          `Invalid array item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });
  }

  return input as T[];
}

/**
 * Validate object input with depth checking
 * @param input - Object to validate
 * @param depth - Current depth (for recursion)
 * @returns Validated object
 */
const DANGEROUS_OBJECT_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

export function validateObject(
  input: unknown,
  depth: number = 0,
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Expected object, got ${typeof input}`,
    );
  }

  if (depth > currentValidationConfig.maxObjectDepth) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Object nesting too deep: ${depth} levels (max: ${currentValidationConfig.maxObjectDepth})`,
    );
  }

  const obj = input as Record<string, unknown>;
  const validated: Record<string, unknown> = Object.create(null);

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    if (DANGEROUS_OBJECT_KEYS.has(sanitizedKey)) {
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      validated[sanitizedKey] = validateObject(value, depth + 1);
    } else {
      validated[sanitizedKey] = value;
    }
  }

  return validated;
}

/**
 * Validate projection configuration
 * @param input - Projection config to validate
 * @returns Validated projection config
 */
export function validateProjectionConfig(input: unknown): ProjectionConfig {
  const obj = validateObject(input);
  const config: ProjectionConfig = {};

  if (Object.hasOwn(obj, 'center') && obj.center !== undefined) {
    config.center = validateCoordinates(obj.center);
  }

  if (Object.hasOwn(obj, 'rotate') && obj.rotate !== undefined) {
    if (Array.isArray(obj.rotate)) {
      const rotateArray = validateArray(obj.rotate, (item) =>
        validateNumber(item, -360, 360),
      );
      if (
        rotateArray.length === 3 &&
        rotateArray[0] !== undefined &&
        rotateArray[1] !== undefined &&
        rotateArray[2] !== undefined
      ) {
        config.rotate = createRotationAngles(
          rotateArray[0],
          rotateArray[1],
          rotateArray[2],
        );
      }
    }
  }

  if (Object.hasOwn(obj, 'scale') && obj.scale !== undefined) {
    config.scale = validateNumber(obj.scale, 0.1, 10000);
  }

  if (Object.hasOwn(obj, 'parallels') && obj.parallels !== undefined) {
    if (Array.isArray(obj.parallels)) {
      const parallelsArray = validateArray(obj.parallels, (item) =>
        validateNumber(item, -90, 90),
      );
      if (
        parallelsArray.length === 2 &&
        parallelsArray[0] !== undefined &&
        parallelsArray[1] !== undefined
      ) {
        config.parallels = createParallels(
          parallelsArray[0],
          parallelsArray[1],
        );
      }
    }
  }

  return config;
}
