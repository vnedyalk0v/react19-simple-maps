import { ZoomTransform } from 'd3-zoom';
import { Coordinates } from '../types';
/**
 * Calculates coordinates from zoom transform
 * @param w - Width of the map
 * @param h - Height of the map
 * @param t - Zoom transform object
 * @returns Branded coordinates
 */
export declare function getCoords(w: number, h: number, t: ZoomTransform): Coordinates;
/**
 * Converts screen coordinates to map coordinates
 * @param screenX - Screen X coordinate
 * @param screenY - Screen Y coordinate
 * @param width - Map width
 * @param height - Map height
 * @param transform - Current zoom transform
 * @returns Map coordinates
 */
export declare function screenToMapCoordinates(screenX: number, screenY: number, width: number, height: number, transform: ZoomTransform): Coordinates;
/**
 * Converts map coordinates to screen coordinates
 * @param coordinates - Map coordinates
 * @param width - Map width
 * @param height - Map height
 * @param transform - Current zoom transform
 * @returns Screen coordinates as [x, y]
 */
export declare function mapToScreenCoordinates(coordinates: Coordinates, width: number, height: number, transform: ZoomTransform): [number, number];
/**
 * Calculates the distance between two coordinates in kilometers
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in kilometers
 */
export declare function calculateDistance(coord1: Coordinates, coord2: Coordinates): number;
/**
 * Converts radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export declare function toDegrees(radians: number): number;
/**
 * Normalizes longitude to be within -180 to 180 range
 * @param longitude - Longitude value
 * @returns Normalized longitude
 */
export declare function normalizeLongitude(longitude: number): number;
/**
 * Normalizes latitude to be within -90 to 90 range
 * @param latitude - Latitude value
 * @returns Normalized latitude
 */
export declare function normalizeLatitude(latitude: number): number;
/**
 * Creates normalized coordinates ensuring they're within valid ranges
 * @param lon - Longitude
 * @param lat - Latitude
 * @returns Normalized coordinates
 */
export declare function createNormalizedCoordinates(lon: number, lat: number): Coordinates;
/**
 * Calculates the center point of multiple coordinates
 * @param coordinates - Array of coordinates
 * @returns Center coordinates
 */
export declare function calculateCenter(coordinates: Coordinates[]): Coordinates;
/**
 * Calculates bounding box for an array of coordinates
 * @param coordinates - Array of coordinates
 * @returns Bounding box as [minLon, minLat, maxLon, maxLat]
 */
export declare function calculateBounds(coordinates: Coordinates[]): [number, number, number, number];
/**
 * Memoized version of calculateBounds for use in React components
 * @param coordinates - Array of coordinates
 * @returns Memoized bounding box calculation
 */
export declare function calculateBoundsMemoized(coordinates: Coordinates[]): [number, number, number, number];
/**
 * Memoized coordinate transformation for screen to map coordinates
 * @param screenX - Screen X coordinate
 * @param screenY - Screen Y coordinate
 * @param width - Map width
 * @param height - Map height
 * @param transform - Current zoom transform
 * @returns Memoized coordinate transformation
 */
export declare function screenToMapCoordinatesMemoized(screenX: number, screenY: number, width: number, height: number, transform: ZoomTransform): Coordinates;
/**
 * Clear coordinate transformation cache (useful for testing or memory management)
 */
export declare function clearCoordinateCache(): void;
//# sourceMappingURL=coordinate-utils.d.ts.map