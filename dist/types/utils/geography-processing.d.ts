import { Feature, FeatureCollection, Geometry, MultiLineString, LineString } from 'geojson';
import { Topology } from 'topojson-specification';
import { GeoPath } from 'd3-geo';
import { PreparedFeature } from '../types';
type MeshGeometry = MultiLineString | LineString;
/**
 * Checks if the input is a string (URL)
 * @param geo - Geography data or URL
 * @returns True if input is a string
 */
export declare function isString(geo: string | Topology | FeatureCollection | Feature<Geometry>[]): geo is string;
/**
 * Extracts features from various geography data formats
 * @param geographies - Geography data (Topology, FeatureCollection, or Feature array)
 * @param parseGeographies - Optional parser function for features
 * @returns Array of features
 */
export declare function getFeatures(geographies: Topology | FeatureCollection | Feature<Geometry>[], parseGeographies?: (geographies: Feature<Geometry>[]) => Feature<Geometry>[]): Feature<Geometry>[];
/**
 * Extracts mesh data from geography data
 * @param geographies - Geography data (only Topology supports mesh)
 * @returns Mesh data or null
 */
export declare function getMesh(geographies: Topology | FeatureCollection | Feature<Geometry>[]): {
    outline: MeshGeometry | null;
    borders: MeshGeometry | null;
} | null;
/**
 * Prepares mesh data by generating SVG paths
 * @param outline - Outline geometry
 * @param borders - Borders geometry
 * @param path - D3 path generator
 * @returns Object with SVG path strings
 */
export declare function prepareMesh(outline: MeshGeometry | null, borders: MeshGeometry | null, path: GeoPath): {
    outline?: string;
    borders?: string;
};
/**
 * Prepares features by generating SVG paths for each feature
 * @param features - Array of features to prepare
 * @param path - D3 path generator
 * @returns Array of prepared features with SVG paths
 */
export declare function prepareFeatures(features: Feature<Geometry>[] | undefined, path: GeoPath): PreparedFeature[];
/**
 * Creates a connector path between two coordinates
 * @param start - Starting coordinates [longitude, latitude]
 * @param end - Ending coordinates [longitude, latitude]
 * @param curve - D3 curve function for path interpolation
 * @returns SVG path string
 */
export declare function createConnectorPath(start: [number, number], end: [number, number], curve: unknown): string;
export {};
//# sourceMappingURL=geography-processing.d.ts.map