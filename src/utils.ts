// Re-export utilities from focused modules
export { getCoords } from './utils/coordinate-utils';
export {
  /** @deprecated Use fetchGeographiesCache instead. */
  fetchGeographies,
  fetchGeographiesCache,
  preloadGeography,
} from './utils/geography-fetching';
export {
  getFeatures,
  getMesh,
  prepareMesh,
  prepareFeatures,
  createConnectorPath,
  isString,
} from './utils/geography-processing';
export {
  validateGeographyUrl,
  validateContentType,
  validateResponseSize,
  readResponseWithSizeLimit,
  validateGeographyData,
  configureGeographySecurity,
  enableDevelopmentMode,
  DEFAULT_GEOGRAPHY_FETCH_CONFIG,
  DEVELOPMENT_GEOGRAPHY_FETCH_CONFIG,
  type GeographySecurityConfig,
} from './utils/geography-validation';

export {
  createGeographyFetchError,
  isGeographyError,
} from './utils/error-utils';
export {
  configureSRI,
  enableStrictSRI,
  disableSRI,
  addCustomSRI,
  generateSRIHash,
  generateSRIForUrls,
  getSRIForUrl,
  validateSRI,
  KNOWN_GEOGRAPHY_SRI,
  DEFAULT_SRI_CONFIG,
  type SRIConfig,
  type SRIEnforcementConfig,
} from './utils/subresource-integrity';

// Import types for type guards
import { GeoProjection } from 'd3-geo';
import {
  GeographyError,
  TypeGuard,
  Longitude,
  Latitude,
  Coordinates,
} from './types';

// Type guards and validation utilities

// Advanced type guards for runtime type checking

export {
  isTopology,
  isFeatureCollection,
  isFeature,
  isValidGeometry,
  isValidGeographyData,
} from './utils/geography-data-guards';

// Coordinate type guards
export function isValidLongitude(value: unknown): value is Longitude {
  return typeof value === 'number' && value >= -180 && value <= 180;
}

export function isValidLatitude(value: unknown): value is Latitude {
  return typeof value === 'number' && value >= -90 && value <= 90;
}

export function isValidCoordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isValidLongitude(value[0]) &&
    isValidLatitude(value[1])
  );
}

// Projection type guards
export function isGeoProjection(value: unknown): value is GeoProjection {
  if (typeof value !== 'function') return false;
  const projection = value as unknown as Record<string, unknown>;
  return (
    typeof projection.stream === 'function' &&
    typeof projection.scale === 'function' &&
    typeof projection.translate === 'function' &&
    (projection.invert === undefined || typeof projection.invert === 'function')
  );
}

export function isProjectionName(value: unknown): value is string {
  return (
    typeof value === 'string' && value.startsWith('geo') && value.length > 3
  );
}

// URL validation type guard
export function isValidGeographyUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    // Allow HTTPS and HTTP for localhost only
    if (url.protocol === 'https:') return true;
    if (url.protocol === 'http:' && url.hostname === 'localhost') return true;
    return false;
  } catch {
    return false;
  }
}

// Complex validation type guards
export function isValidMapDimensions(width: unknown, height: unknown): boolean {
  return (
    typeof width === 'number' &&
    typeof height === 'number' &&
    width > 0 &&
    height > 0 &&
    Number.isFinite(width) &&
    Number.isFinite(height)
  );
}

// Factory function for creating custom type guards
export function createTypeGuard<T>(
  predicate: (value: unknown) => boolean,
): TypeGuard<T> {
  return (value: unknown): value is T => predicate(value);
}

// Utility functions to create enhanced geography errors
export function createGeographyError(
  type: GeographyError['type'],
  message: string,
  geography?: string,
  details?: Record<string, unknown>,
): GeographyError {
  const error = new Error(message) as GeographyError;
  error.type = type;
  if (geography) error.geography = geography;
  if (details) error.details = details;
  return error;
}

// Convenience functions for creating specific error types
export function createValidationError(
  message: string,
  geography?: string,
  details?: Record<string, unknown>,
): GeographyError {
  return createGeographyError('VALIDATION_ERROR', message, geography, details);
}

export function createSecurityError(
  message: string,
  geography?: string,
  details?: Record<string, unknown>,
): GeographyError {
  return createGeographyError('SECURITY_ERROR', message, geography, details);
}

export function createProjectionError(
  message: string,
  geography?: string,
  details?: Record<string, unknown>,
): GeographyError {
  return createGeographyError('PROJECTION_ERROR', message, geography, details);
}

export function createConfigurationError(
  message: string,
  geography?: string,
  details?: Record<string, unknown>,
): GeographyError {
  return createGeographyError(
    'CONFIGURATION_ERROR',
    message,
    geography,
    details,
  );
}

export function createContextError(
  message: string,
  geography?: string,
  details?: Record<string, unknown>,
): GeographyError {
  return createGeographyError('CONTEXT_ERROR', message, geography, details);
}
