// Re-export utilities from focused modules
export { getCoords } from './utils/coordinate-utils';
export {
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

export { createGeographyFetchError } from './utils/error-utils';
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
import { Feature, FeatureCollection, Geometry } from 'geojson';
import { Topology } from 'topojson-specification';

// Type guards and validation utilities remain in this file

// Advanced type guards for runtime type checking

// Geography data type guards
export function isTopology(value: unknown): value is Topology {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    obj.type === 'Topology' &&
    typeof obj.objects === 'object' &&
    obj.objects !== null &&
    Array.isArray(obj.arcs)
  );
}

export function isFeatureCollection(
  value: unknown,
): value is FeatureCollection {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return obj.type === 'FeatureCollection' && Array.isArray(obj.features);
}

export function isFeature(value: unknown): value is Feature<Geometry> {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return obj.type === 'Feature' && 'geometry' in obj && 'properties' in obj;
}

export function isValidGeometry(value: unknown): value is Geometry {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  if (!('type' in obj)) return false;

  const validTypes = [
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
    'GeometryCollection',
  ];

  return validTypes.includes(obj.type as string);
}

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
  return (
    typeof value === 'function' &&
    'invert' in value &&
    typeof (value as Record<string, unknown>).invert === 'function'
  );
}

export function isProjectionName(value: unknown): value is string {
  return (
    typeof value === 'string' && value.startsWith('geo') && value.length > 3
  );
}

// Error type guards
export function isGeographyError(error: unknown): error is GeographyError {
  if (!(error instanceof Error)) return false;

  const errorObj = error as unknown as Record<string, unknown>;
  return (
    'type' in errorObj &&
    typeof errorObj.type === 'string' &&
    [
      'GEOGRAPHY_LOAD_ERROR',
      'GEOGRAPHY_PARSE_ERROR',
      'PROJECTION_ERROR',
      'VALIDATION_ERROR',
      'SECURITY_ERROR',
      'CONFIGURATION_ERROR',
      'CONTEXT_ERROR',
    ].includes(errorObj.type)
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
export function isValidGeographyData(
  value: unknown,
): value is Topology | FeatureCollection {
  return isTopology(value) || isFeatureCollection(value);
}

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
