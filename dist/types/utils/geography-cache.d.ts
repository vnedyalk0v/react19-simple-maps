import { Feature, Geometry, FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
import { PreparedFeature } from '../types';
declare const CACHE_CONFIG: {
    TTL: number;
    MAX_SIZES: {
        features: number;
        preparedFeatures: number;
        meshData: number;
        coordinates: number;
    };
    ENABLE_WEAKMAP_CACHE: boolean;
    ENABLE_LRU_CACHE: boolean;
    ENABLE_COORDINATE_CACHE: boolean;
};
export declare function cacheFeatures(key: string, features: Feature<Geometry>[]): void;
export declare function getCachedFeatures(key: string): Feature<Geometry>[] | undefined;
export declare function cachePreparedFeatures(key: string, preparedFeatures: PreparedFeature[]): void;
export declare function getCachedPreparedFeatures(key: string): PreparedFeature[] | undefined;
export declare function cacheMeshData(key: string, meshData: {
    outline: string;
    borders: string;
}): void;
export declare function getCachedMeshData(key: string): {
    outline: string;
    borders: string;
} | undefined;
export declare function generateFeaturesCacheKey(data: unknown, parseGeographies?: (features: Feature<Geometry>[]) => Feature<Geometry>[]): string;
export declare function generatePreparedFeaturesCacheKey(features: Feature<Geometry>[], pathFunction: unknown): string;
export declare function generateMeshCacheKey(data: unknown, pathFunction: unknown): string;
export declare function clearGeographyCache(): void;
interface CacheMetrics {
    hits: number;
    misses: number;
    hitRate: number;
}
export declare function getCachedFeaturesWithMetrics(key: string): Feature<Geometry>[] | undefined;
export declare function getCachedPreparedFeaturesWithMetrics(key: string): PreparedFeature[] | undefined;
export declare function getCachedMeshDataWithMetrics(key: string): {
    outline: string;
    borders: string;
} | undefined;
/**
 * Get cached geography data using WeakMap for object-based keys
 */
export declare function getCachedGeographyData(geographyObject: FeatureCollection | Topology): {
    features: Feature<Geometry>[];
    mesh: unknown;
} | null;
/**
 * Cache geography data using WeakMap
 */
export declare function cacheGeographyData(geographyObject: FeatureCollection | Topology, features: Feature<Geometry>[], mesh: unknown): void;
/**
 * Get cached prepared features using WeakMap
 */
export declare function getCachedPreparedFeaturesWeakMap(geographyObject: FeatureCollection | Topology, pathFunctionString: string): PreparedFeature[] | null;
/**
 * Cache prepared features using WeakMap
 */
export declare function cachePreparedFeaturesWeakMap(geographyObject: FeatureCollection | Topology, prepared: PreparedFeature[], pathFunctionString: string): void;
/**
 * Aggressive coordinate transformation caching
 */
export declare function getCachedCoordinateTransform(transformObject: object, key: string): unknown;
/**
 * Cache coordinate transformation
 */
export declare function cacheCoordinateTransform(transformObject: object, key: string, value: unknown): void;
/**
 * Clear all aggressive caches
 */
export declare function clearAggressiveCaches(): void;
export declare function getCacheStats(): {
    features: number;
    preparedFeatures: number;
    meshData: number;
    config: typeof CACHE_CONFIG;
};
export declare function getCacheMetrics(): {
    features: CacheMetrics;
    preparedFeatures: CacheMetrics;
    meshData: CacheMetrics;
};
export {};
//# sourceMappingURL=geography-cache.d.ts.map