import { geoCentroid, geoBounds } from 'd3-geo';
import { Feature, Geometry } from 'geojson';
import { Coordinates, createCoordinates } from '../types';

/**
 * Calculates the centroid (center point) of a geographic feature
 * @param geography - GeoJSON feature
 * @returns Centroid coordinates or null if calculation fails
 */
export function getGeographyCentroid(
  geography: Feature<Geometry>,
): Coordinates | null {
  // Validate input
  if (!geography?.geometry) {
    return null;
  }

  // d3-geo throws on malformed or empty geometries
  let centroid: [number, number];
  try {
    centroid = geoCentroid(geography);
  } catch {
    return null;
  }

  // Validate centroid coordinates
  if (
    !centroid ||
    !isFinite(centroid[0]) ||
    !isFinite(centroid[1]) ||
    Math.abs(centroid[0]) > 180 ||
    Math.abs(centroid[1]) > 90
  ) {
    return null;
  }

  return createCoordinates(centroid[0], centroid[1]);
}

/**
 * Calculates the bounding box of a geographic feature
 * @param geography - GeoJSON feature
 * @returns Bounding box as [southwest, northeast] coordinates or null if calculation fails
 */
export function getGeographyBounds(
  geography: Feature<Geometry>,
): [Coordinates, Coordinates] | null {
  // Validate input
  if (!geography?.geometry) {
    return null;
  }

  // d3-geo throws on malformed or empty geometries
  let bounds: [[number, number], [number, number]];
  try {
    bounds = geoBounds(geography);
  } catch {
    return null;
  }

  // Validate bounds structure
  if (
    !bounds ||
    !Array.isArray(bounds) ||
    bounds.length !== 2 ||
    !Array.isArray(bounds[0]) ||
    !Array.isArray(bounds[1]) ||
    bounds[0].length !== 2 ||
    bounds[1].length !== 2
  ) {
    return null;
  }

  const [southwest, northeast] = bounds;

  // Validate coordinate ranges
  if (
    !isFinite(southwest[0]) ||
    !isFinite(southwest[1]) ||
    !isFinite(northeast[0]) ||
    !isFinite(northeast[1]) ||
    Math.abs(southwest[0]) > 180 ||
    Math.abs(southwest[1]) > 90 ||
    Math.abs(northeast[0]) > 180 ||
    Math.abs(northeast[1]) > 90
  ) {
    return null;
  }

  return [
    createCoordinates(southwest[0], southwest[1]),
    createCoordinates(northeast[0], northeast[1]),
  ];
}

/**
 * Extracts coordinates from different geometry types
 * @param geography - GeoJSON feature
 * @returns First available coordinate or null
 */
function getGeographyCoordinatesInternal(
  geography: Feature<Geometry>,
): Coordinates | null {
  if (!geography?.geometry) {
    return null;
  }

  const { geometry } = geography;

  switch (geometry.type) {
    case 'Point':
      if (
        geometry.coordinates &&
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length >= 2 &&
        typeof geometry.coordinates[0] === 'number' &&
        typeof geometry.coordinates[1] === 'number'
      ) {
        const [lon, lat] = geometry.coordinates;
        return createCoordinates(lon, lat);
      }
      break;

    case 'LineString':
      if (
        geometry.coordinates &&
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length > 0 &&
        Array.isArray(geometry.coordinates[0]) &&
        geometry.coordinates[0].length >= 2 &&
        typeof geometry.coordinates[0][0] === 'number' &&
        typeof geometry.coordinates[0][1] === 'number'
      ) {
        const [lon, lat] = geometry.coordinates[0];
        return createCoordinates(lon, lat);
      }
      break;

    case 'Polygon':
      if (
        geometry.coordinates &&
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length > 0 &&
        Array.isArray(geometry.coordinates[0]) &&
        geometry.coordinates[0].length > 0 &&
        Array.isArray(geometry.coordinates[0][0]) &&
        geometry.coordinates[0][0].length >= 2 &&
        typeof geometry.coordinates[0][0][0] === 'number' &&
        typeof geometry.coordinates[0][0][1] === 'number'
      ) {
        const [lon, lat] = geometry.coordinates[0][0];
        return createCoordinates(lon, lat);
      }
      break;

    case 'MultiPoint':
      if (
        geometry.coordinates &&
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length > 0 &&
        Array.isArray(geometry.coordinates[0]) &&
        geometry.coordinates[0].length >= 2 &&
        typeof geometry.coordinates[0][0] === 'number' &&
        typeof geometry.coordinates[0][1] === 'number'
      ) {
        const [lon, lat] = geometry.coordinates[0];
        return createCoordinates(lon, lat);
      }
      break;

    case 'MultiLineString':
      if (Array.isArray(geometry.coordinates)) {
        for (const coordinates of geometry.coordinates) {
          if (Array.isArray(coordinates) && coordinates.length === 0) continue;
          return getGeographyCoordinatesInternal({
            ...geography,
            geometry: { type: 'LineString', coordinates },
          });
        }
      }
      break;

    case 'MultiPolygon':
      if (Array.isArray(geometry.coordinates)) {
        for (const coordinates of geometry.coordinates) {
          if (Array.isArray(coordinates) && coordinates.length === 0) continue;
          return getGeographyCoordinatesInternal({
            ...geography,
            geometry: { type: 'Polygon', coordinates },
          });
        }
      }
      break;

    default:
      return null;
  }

  return null;
}

export function getGeographyCoordinates(
  geography: Feature<Geometry>,
): Coordinates | null {
  if (!geography?.geometry) return null;

  const stack: Geometry[] = [geography.geometry];
  const visited = new Set<Geometry>();
  while (stack.length > 0) {
    const geometry = stack.pop();
    if (!geometry) continue;

    if (geometry.type === 'GeometryCollection') {
      if (visited.has(geometry) || !Array.isArray(geometry.geometries))
        continue;
      visited.add(geometry);
      for (let index = geometry.geometries.length - 1; index >= 0; index -= 1) {
        const child = geometry.geometries[index];
        if (child) stack.push(child);
      }
    } else {
      const coordinates = getGeographyCoordinatesInternal({
        ...geography,
        geometry,
      });
      if (isValidCoordinates(coordinates)) return coordinates;
    }
  }

  return null;
}

/**
 * Gets the best available coordinate representation for a geography
 * Tries centroid first, falls back to first coordinate
 * @param geography - GeoJSON feature
 * @returns Best available coordinates or null
 */
export function getBestGeographyCoordinates(
  geography: Feature<Geometry>,
): Coordinates | null {
  // Try centroid first (most accurate for polygons)
  const centroid = getGeographyCentroid(geography);
  if (centroid) {
    return centroid;
  }

  // Fall back to first available coordinate
  return getGeographyCoordinates(geography);
}

/**
 * Type guard to check if coordinates are valid
 * @param coords - Coordinates to validate
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(coords: unknown): coords is Coordinates {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number' &&
    isFinite(coords[0]) &&
    isFinite(coords[1]) &&
    Math.abs(coords[0]) <= 180 &&
    Math.abs(coords[1]) <= 90
  );
}
