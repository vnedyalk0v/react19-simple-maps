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
import { Feature, FeatureCollection, Geometry } from 'geojson';
import { Topology } from 'topojson-specification';

// Type guards and validation utilities remain in this file

// Advanced type guards for runtime type checking

// Geography data type guards
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArrayOf(
  value: unknown,
  predicate: (item: unknown) => boolean,
): boolean {
  if (!Array.isArray(value)) return false;
  for (const item of value) {
    if (!predicate(item)) return false;
  }
  return true;
}

function isPosition(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    isArrayOf(
      value,
      (item) => typeof item === 'number' && Number.isFinite(item),
    )
  );
}

function isNestedArray(
  value: unknown,
  depth: number,
  predicate: (item: unknown) => boolean,
): boolean {
  return depth === 0
    ? predicate(value)
    : isArrayOf(value, (item) => isNestedArray(item, depth - 1, predicate));
}

function hasValidProperties(value: Record<string, unknown>): boolean {
  return (
    (value.properties === null || isRecord(value.properties)) &&
    (value.id === undefined ||
      typeof value.id === 'string' ||
      typeof value.id === 'number')
  );
}

function isGeometry(
  value: unknown,
  topologyArcs?: readonly unknown[][],
): boolean {
  const ancestors = new Set<object>();
  const stack: Array<{ geometry: unknown; exit?: boolean }> = [
    { geometry: value },
  ];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame || !isRecord(frame.geometry)) return false;
    const geometry = frame.geometry;
    if (frame.exit) {
      ancestors.delete(geometry);
      continue;
    }
    if (ancestors.has(geometry)) return false;
    if (geometry.type === 'GeometryCollection') {
      if (!Array.isArray(geometry.geometries)) return false;
      ancestors.add(geometry);
      stack.push({ geometry, exit: true });
      for (const child of geometry.geometries) {
        stack.push({ geometry: child });
      }
    } else if (!isLeafGeometry(geometry, topologyArcs)) {
      return false;
    }
  }
  return true;
}

function isLeafGeometry(
  value: Record<string, unknown>,
  topologyArcs?: readonly unknown[][],
): boolean {
  if (topologyArcs !== undefined && value.type === null) return true;

  let depth: number;
  switch (value.type) {
    case 'Point':
      return isPosition(value.coordinates);
    case 'MultiPoint':
      return isArrayOf(value.coordinates, isPosition);
    case 'LineString':
      depth = 1;
      break;
    case 'Polygon':
    case 'MultiLineString':
      depth = 2;
      break;
    case 'MultiPolygon':
      depth = 3;
      break;
    default:
      return false;
  }

  if (topologyArcs === undefined) {
    return isNestedArray(value.coordinates, depth, isPosition);
  }
  return isNestedArray(
    value.arcs,
    depth - 1,
    (indexes) =>
      Array.isArray(indexes) &&
      indexes.length > 0 &&
      isArrayOf(indexes, (index) => {
        if (typeof index !== 'number' || !Number.isInteger(index)) return false;
        const arcIndex = index < 0 ? -index - 1 : index;
        return (topologyArcs[arcIndex]?.length ?? 0) > 0;
      }),
  );
}

export function isTopology(value: unknown): value is Topology {
  if (!isRecord(value) || value.type !== 'Topology') return false;
  if (
    !isRecord(value.objects) ||
    !isArrayOf(value.arcs, (arc) => isArrayOf(arc, isPosition))
  ) {
    return false;
  }
  const topologyArcs = value.arcs as unknown[][];
  if (
    value.transform !== undefined &&
    (!isRecord(value.transform) ||
      !isPosition(value.transform.scale) ||
      (value.transform.scale as unknown[]).length !== 2 ||
      !isPosition(value.transform.translate) ||
      (value.transform.translate as unknown[]).length !== 2)
  ) {
    return false;
  }
  return Object.values(value.objects).every((geometry) =>
    isGeometry(geometry, topologyArcs),
  );
}

export function isFeatureCollection(
  value: unknown,
): value is FeatureCollection {
  return (
    isRecord(value) &&
    value.type === 'FeatureCollection' &&
    isArrayOf(value.features, isFeature)
  );
}

export function isFeature(value: unknown): value is Feature<Geometry> {
  return (
    isRecord(value) &&
    value.type === 'Feature' &&
    hasValidProperties(value) &&
    isValidGeometry(value.geometry)
  );
}

export function isValidGeometry(value: unknown): value is Geometry {
  return isGeometry(value);
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
