import { Feature, Geometry } from 'geojson';
import { Coordinates } from '../types';
/**
 * Calculates the centroid (center point) of a geographic feature
 * @param geography - GeoJSON feature
 * @returns Centroid coordinates or null if calculation fails
 */
export declare function getGeographyCentroid(geography: Feature<Geometry>): Coordinates | null;
/**
 * Calculates the bounding box of a geographic feature
 * @param geography - GeoJSON feature
 * @returns Bounding box as [southwest, northeast] coordinates or null if calculation fails
 */
export declare function getGeographyBounds(geography: Feature<Geometry>): [Coordinates, Coordinates] | null;
/**
 * Extracts coordinates from different geometry types
 * @param geography - GeoJSON feature
 * @returns First available coordinate or null
 */
export declare function getGeographyCoordinates(geography: Feature<Geometry>): Coordinates | null;
/**
 * Gets the best available coordinate representation for a geography
 * Tries centroid first, falls back to first coordinate
 * @param geography - GeoJSON feature
 * @returns Best available coordinates or null
 */
export declare function getBestGeographyCoordinates(geography: Feature<Geometry>): Coordinates | null;
/**
 * Type guard to check if coordinates are valid
 * @param coords - Coordinates to validate
 * @returns True if coordinates are valid
 */
export declare function isValidCoordinates(coords: unknown): coords is Coordinates;
//# sourceMappingURL=geography-utils.d.ts.map