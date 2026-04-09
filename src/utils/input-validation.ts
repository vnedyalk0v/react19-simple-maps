import { createGeographyFetchError } from './error-utils';
import { createRotationAngles, createParallels } from '../types';
import type {
  Coordinates,
  ProjectionConfig,
  GeographySecurityConfig,
  SRIConfig,
} from '../types';

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
    process.env.NODE_ENV === 'production' &&
    nextConfig.allowUnsafeContent
  ) {
    nextConfig.allowUnsafeContent = false;
  }

  return Object.freeze(nextConfig);
}

let currentValidationConfig: ValidationConfig = createValidationConfig({});

/**
 * Configure input validation settings
 * @param config - Validation configuration
 */
export function configureValidation(config: Partial<ValidationConfig>): void {
  currentValidationConfig = createValidationConfig(config);
}

export function getValidationConfig(): ValidationConfig {
  return currentValidationConfig;
}

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

/**
 * Sanitize SVG content to prevent XSS attacks
 * @param svgContent - SVG content to sanitize
 * @returns Sanitized SVG content
 */
export function sanitizeSVG(svgContent: string): string {
  if (!currentValidationConfig.allowUnsafeContent) {
    // Remove dangerous SVG elements and attributes
    let sanitized = svgContent
      .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
      .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '') // Remove iframe tags
      .replace(/<object[^>]*>.*?<\/object>/gis, '') // Remove object tags
      .replace(/<embed[^>]*>/gis, '') // Remove embed tags
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:(?!image\/)/gi, '') // Remove non-image data: URLs
      .replace(/vbscript:/gi, ''); // Remove vbscript: URLs

    // Remove dangerous attributes
    const dangerousAttrs = [
      'onload',
      'onerror',
      'onclick',
      'onmouseover',
      'onmouseout',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'onreset',
    ];

    dangerousAttrs.forEach((attr) => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }

  return svgContent;
}

/**
 * Validate geography security configuration
 * @param input - Security config to validate
 * @returns Validated security config
 */
export function validateSecurityConfig(
  input: unknown,
): Partial<GeographySecurityConfig> {
  const obj = validateObject(input);
  const config: Partial<GeographySecurityConfig> = {};

  if (Object.hasOwn(obj, 'TIMEOUT_MS') && obj.TIMEOUT_MS !== undefined) {
    config.TIMEOUT_MS = validateNumber(obj.TIMEOUT_MS, 1000, 60000);
  }

  if (
    Object.hasOwn(obj, 'MAX_RESPONSE_SIZE') &&
    obj.MAX_RESPONSE_SIZE !== undefined
  ) {
    config.MAX_RESPONSE_SIZE = validateNumber(
      obj.MAX_RESPONSE_SIZE,
      1024,
      100 * 1024 * 1024,
    );
  }

  if (
    Object.hasOwn(obj, 'ALLOWED_CONTENT_TYPES') &&
    obj.ALLOWED_CONTENT_TYPES !== undefined
  ) {
    config.ALLOWED_CONTENT_TYPES = validateArray(
      obj.ALLOWED_CONTENT_TYPES,
      (item) => sanitizeString(item),
    );
  }

  if (
    Object.hasOwn(obj, 'ALLOWED_PROTOCOLS') &&
    obj.ALLOWED_PROTOCOLS !== undefined
  ) {
    config.ALLOWED_PROTOCOLS = validateArray(obj.ALLOWED_PROTOCOLS, (item) => {
      const protocol = sanitizeString(item);
      if (!['https:', 'http:'].includes(protocol)) {
        throw createGeographyFetchError(
          'VALIDATION_ERROR',
          `Invalid protocol: ${protocol}`,
        );
      }
      return protocol;
    });
  }

  if (
    Object.hasOwn(obj, 'ALLOW_HTTP_LOCALHOST') &&
    obj.ALLOW_HTTP_LOCALHOST !== undefined
  ) {
    if (typeof obj.ALLOW_HTTP_LOCALHOST !== 'boolean') {
      throw createGeographyFetchError(
        'VALIDATION_ERROR',
        'ALLOW_HTTP_LOCALHOST must be a boolean',
      );
    }
    config.ALLOW_HTTP_LOCALHOST = obj.ALLOW_HTTP_LOCALHOST;
  }

  if (
    Object.hasOwn(obj, 'STRICT_HTTPS_ONLY') &&
    obj.STRICT_HTTPS_ONLY !== undefined
  ) {
    if (typeof obj.STRICT_HTTPS_ONLY !== 'boolean') {
      throw createGeographyFetchError(
        'VALIDATION_ERROR',
        'STRICT_HTTPS_ONLY must be a boolean',
      );
    }
    config.STRICT_HTTPS_ONLY = obj.STRICT_HTTPS_ONLY;
  }

  return config;
}

/**
 * Validate SRI configuration
 * @param input - SRI config to validate
 * @returns Validated SRI config
 */
export function validateSRIConfig(input: unknown): SRIConfig {
  const obj = validateObject(input);

  if (
    !Object.hasOwn(obj, 'algorithm') ||
    !Object.hasOwn(obj, 'hash') ||
    !Object.hasOwn(obj, 'enforceIntegrity')
  ) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'SRI config must have algorithm, hash, and enforceIntegrity properties',
    );
  }

  const algorithm = sanitizeString(obj.algorithm);
  if (!['sha256', 'sha384', 'sha512'].includes(algorithm)) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Invalid SRI algorithm: ${algorithm}`,
    );
  }

  const hash = sanitizeString(obj.hash);
  if (!hash.startsWith(`${algorithm}-`)) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `SRI hash must start with ${algorithm}-`,
    );
  }

  if (typeof obj.enforceIntegrity !== 'boolean') {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'enforceIntegrity must be a boolean',
    );
  }

  return {
    algorithm: algorithm as 'sha256' | 'sha384' | 'sha512',
    hash,
    enforceIntegrity: obj.enforceIntegrity,
  };
}

/**
 * Validate and sanitize CSS class names
 * @param input - Class name to validate
 * @returns Sanitized class name
 */
export function validateClassName(input: unknown): string {
  const sanitized = sanitizeString(input);

  // Remove potentially dangerous characters from class names
  const cleanClassName = sanitized
    .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Only allow alphanumeric, hyphens, underscores, and spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (cleanClassName.length === 0) {
    return '';
  }

  return cleanClassName;
}

/**
 * Validate and sanitize style objects for SVG elements
 * @param input - Style object to validate
 * @returns Sanitized style object
 */
export function validateStyleObject(
  input: unknown,
): Record<string, string | number> {
  if (input === null || input === undefined) {
    return {};
  }

  const obj = validateObject(input);
  const sanitizedStyle: Record<string, string | number> = {};

  // List of allowed CSS properties for SVG elements
  const allowedProperties = [
    'fill',
    'stroke',
    'strokeWidth',
    'strokeDasharray',
    'strokeLinecap',
    'strokeLinejoin',
    'opacity',
    'fillOpacity',
    'strokeOpacity',
    'transform',
    'cursor',
    'pointerEvents',
    'transition',
    'fontSize',
    'fontFamily',
    'fontWeight',
    'textAnchor',
    'alignmentBaseline',
    'dominantBaseline',
  ];

  for (const [key, value] of Object.entries(obj)) {
    // Sanitize property name
    const sanitizedKey = sanitizeString(key);

    // Check if property is allowed
    if (!allowedProperties.includes(sanitizedKey)) {
      continue; // Skip disallowed properties
    }

    // Validate and sanitize property value
    if (typeof value === 'string') {
      const sanitizedValue = sanitizeString(value);

      // Remove dangerous CSS values
      if (
        sanitizedValue.includes('javascript:') ||
        sanitizedValue.includes('expression(') ||
        sanitizedValue.includes('url(') ||
        sanitizedValue.includes('@import')
      ) {
        continue; // Skip dangerous values
      }

      sanitizedStyle[sanitizedKey] = sanitizedValue;
    } else if (typeof value === 'number' && isFinite(value)) {
      sanitizedStyle[sanitizedKey] = value;
    }
  }

  return sanitizedStyle;
}

/**
 * Validate event handler functions
 * @param input - Event handler to validate
 * @returns Validated event handler or undefined
 */
export function validateEventHandler(input: unknown): Function | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (typeof input !== 'function') {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Event handler must be a function, got ${typeof input}`,
    );
  }

  // Check if function has suspicious characteristics
  const funcString = input.toString();
  const dangerousPatterns = [
    'eval(',
    'Function(',
    'setTimeout(',
    'setInterval(',
    'document.write',
    'innerHTML',
    'outerHTML',
    'insertAdjacentHTML',
  ];

  for (const pattern of dangerousPatterns) {
    if (funcString.includes(pattern)) {
      throw createGeographyFetchError(
        'SECURITY_ERROR',
        `Event handler contains potentially dangerous code: ${pattern}`,
      );
    }
  }

  return input as Function;
}

/**
 * Comprehensive validation for component props
 * @param props - Props object to validate
 * @param allowedProps - List of allowed property names
 * @returns Validated props object
 */
export function validateComponentProps(
  props: unknown,
  allowedProps: readonly string[],
): Record<string, unknown> {
  const obj = validateObject(props);
  const validatedProps: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);

    // Check if prop is allowed
    if (!allowedProps.includes(sanitizedKey)) {
      continue; // Skip disallowed props
    }

    // Apply specific validation based on prop type
    if (sanitizedKey === 'className') {
      validatedProps[sanitizedKey] = validateClassName(value);
    } else if (sanitizedKey === 'style') {
      validatedProps[sanitizedKey] = validateStyleObject(value);
    } else if (sanitizedKey.startsWith('on') && typeof value === 'function') {
      validatedProps[sanitizedKey] = validateEventHandler(value);
    } else if (typeof value === 'string') {
      validatedProps[sanitizedKey] = sanitizeString(value);
    } else if (typeof value === 'number' && isFinite(value)) {
      validatedProps[sanitizedKey] = value;
    } else if (typeof value === 'boolean') {
      validatedProps[sanitizedKey] = value;
    } else if (Array.isArray(value)) {
      validatedProps[sanitizedKey] = validateArray(value);
    } else if (value !== null && typeof value === 'object') {
      validatedProps[sanitizedKey] = validateObject(value);
    }
  }

  return validatedProps;
}
