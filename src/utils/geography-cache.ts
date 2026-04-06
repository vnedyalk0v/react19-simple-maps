import { Feature, Geometry, FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
import { PreparedFeature } from '../types';

// LRU Cache implementation for better memory management
class LRUCache<T> {
  private cache: Map<string, T>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      // Update existing key
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Cache for processed geography data with LRU eviction
interface GeographyCache {
  features: LRUCache<Feature<Geometry>[]>;
  preparedFeatures: LRUCache<PreparedFeature[]>;
  meshData: LRUCache<{ outline: string; borders: string }>;
}

// Create LRU caches for memory-efficient caching
const geographyCache: GeographyCache = {
  features: new LRUCache(50),
  preparedFeatures: new LRUCache(30), // Smaller since these are larger objects
  meshData: new LRUCache(40),
};

// WeakMap-based caches for object-based keys (memory-efficient)
const weakMapCaches = {
  // Cache for raw geography data objects
  geographyDataCache: new WeakMap<
    FeatureCollection | Topology,
    {
      features: Feature<Geometry>[];
      mesh: { outline: unknown; borders: unknown } | null;
      timestamp: number;
    }
  >(),

  // Cache for prepared features by geography object
  preparedFeaturesCache: new WeakMap<
    FeatureCollection | Topology,
    {
      prepared: PreparedFeature[];
      pathFunction: string;
      timestamp: number;
    }
  >(),

  // Cache for coordinate transformations
  coordinateTransformCache: new WeakMap<object, Map<string, unknown>>(),
};

// Aggressive caching configuration
const CACHE_CONFIG = {
  // Time-based cache invalidation (5 minutes)
  TTL: 5 * 60 * 1000,

  // Maximum cache sizes for different data types
  MAX_SIZES: {
    features: 100,
    preparedFeatures: 50,
    meshData: 75,
    coordinates: 200,
  },

  // Enable/disable different cache layers
  ENABLE_WEAKMAP_CACHE: true,
  ENABLE_LRU_CACHE: true,
  ENABLE_COORDINATE_CACHE: true,
};

const objectCacheTokens = new WeakMap<object, string>();
let objectCacheTokenCounter = 0;

function getObjectCacheToken(value: unknown): string {
  if (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null
  ) {
    const existingToken = objectCacheTokens.get(value);
    if (existingToken) {
      return existingToken;
    }

    objectCacheTokenCounter += 1;
    const nextToken = `obj:${objectCacheTokenCounter}`;
    objectCacheTokens.set(value, nextToken);
    return nextToken;
  }

  return String(value);
}

// Generate cache key from geography data
function generateCacheKey(data: unknown, additionalKey?: string): string {
  const baseKey =
    typeof data === 'string' ? data : JSON.stringify(data).slice(0, 100); // Limit key length

  return additionalKey ? `${baseKey}:${additionalKey}` : baseKey;
}

// Cache features
export function cacheFeatures(
  key: string,
  features: Feature<Geometry>[],
): void {
  geographyCache.features.set(key, features);
}

export function getCachedFeatures(
  key: string,
): Feature<Geometry>[] | undefined {
  return geographyCache.features.get(key);
}

// Cache prepared features (with SVG paths)
export function cachePreparedFeatures(
  key: string,
  preparedFeatures: PreparedFeature[],
): void {
  geographyCache.preparedFeatures.set(key, preparedFeatures);
}

export function getCachedPreparedFeatures(
  key: string,
): PreparedFeature[] | undefined {
  return geographyCache.preparedFeatures.get(key);
}

// Cache mesh data
export function cacheMeshData(
  key: string,
  meshData: { outline: string; borders: string },
): void {
  geographyCache.meshData.set(key, meshData);
}

export function getCachedMeshData(
  key: string,
): { outline: string; borders: string } | undefined {
  return geographyCache.meshData.get(key);
}

// Generate cache keys for different data types
export function generateFeaturesCacheKey(
  data: unknown,
  parseGeographies?: (features: Feature<Geometry>[]) => Feature<Geometry>[],
): string {
  const parseKey = parseGeographies
    ? parseGeographies.toString().slice(0, 50)
    : 'default';
  return generateCacheKey(data, `features:${parseKey}`);
}

export function generatePreparedFeaturesCacheKey(
  features: Feature<Geometry>[],
  pathFunction: unknown,
): string {
  const featuresKey = features
    .map((f) => f.id || f.properties?.NAME || '')
    .join(',')
    .slice(0, 100);
  const pathKey = getObjectCacheToken(pathFunction);
  return `prepared:${featuresKey}:${pathKey}`;
}

export function generateMeshCacheKey(
  data: unknown,
  pathFunction: unknown,
): string {
  const pathKey = getObjectCacheToken(pathFunction);
  return generateCacheKey(data, `mesh:${pathKey}`);
}

export function getPathFunctionCacheToken(pathFunction: unknown): string {
  return getObjectCacheToken(pathFunction);
}

// Clear all caches (useful for testing or memory management)
export function clearGeographyCache(): void {
  geographyCache.features.clear();
  geographyCache.preparedFeatures.clear();
  geographyCache.meshData.clear();
}

// Performance monitoring for cache hit rates
interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
}

const cacheMetrics = {
  features: { hits: 0, misses: 0 },
  preparedFeatures: { hits: 0, misses: 0 },
  meshData: { hits: 0, misses: 0 },
};

// Enhanced cache functions with metrics
export function getCachedFeaturesWithMetrics(
  key: string,
): Feature<Geometry>[] | undefined {
  const result = geographyCache.features.get(key);
  if (result) {
    cacheMetrics.features.hits++;
  } else {
    cacheMetrics.features.misses++;
  }
  return result;
}

export function getCachedPreparedFeaturesWithMetrics(
  key: string,
): PreparedFeature[] | undefined {
  const result = geographyCache.preparedFeatures.get(key);
  if (result) {
    cacheMetrics.preparedFeatures.hits++;
  } else {
    cacheMetrics.preparedFeatures.misses++;
  }
  return result;
}

export function getCachedMeshDataWithMetrics(
  key: string,
): { outline: string; borders: string } | undefined {
  const result = geographyCache.meshData.get(key);
  if (result) {
    cacheMetrics.meshData.hits++;
  } else {
    cacheMetrics.meshData.misses++;
  }
  return result;
}

// Aggressive caching functions using WeakMap for memory efficiency

/**
 * Get cached geography data using WeakMap for object-based keys
 */
export function getCachedGeographyData(
  geographyObject: FeatureCollection | Topology,
): { features: Feature<Geometry>[]; mesh: unknown } | null {
  if (!CACHE_CONFIG.ENABLE_WEAKMAP_CACHE) return null;

  const cached = weakMapCaches.geographyDataCache.get(geographyObject);
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
    return {
      features: cached.features,
      mesh: cached.mesh,
    };
  }
  return null;
}

/**
 * Cache geography data using WeakMap
 */
export function cacheGeographyData(
  geographyObject: FeatureCollection | Topology,
  features: Feature<Geometry>[],
  mesh: unknown,
): void {
  if (!CACHE_CONFIG.ENABLE_WEAKMAP_CACHE) return;

  weakMapCaches.geographyDataCache.set(geographyObject, {
    features,
    mesh: mesh as { outline: unknown; borders: unknown } | null,
    timestamp: Date.now(),
  });
}

/**
 * Get cached prepared features using WeakMap
 */
export function getCachedPreparedFeaturesWeakMap(
  geographyObject: FeatureCollection | Topology,
  pathFunctionToken: string,
): PreparedFeature[] | null {
  if (!CACHE_CONFIG.ENABLE_WEAKMAP_CACHE) return null;

  const cached = weakMapCaches.preparedFeaturesCache.get(geographyObject);
  if (
    cached &&
    cached.pathFunction === pathFunctionToken &&
    Date.now() - cached.timestamp < CACHE_CONFIG.TTL
  ) {
    return cached.prepared;
  }
  return null;
}

/**
 * Cache prepared features using WeakMap
 */
export function cachePreparedFeaturesWeakMap(
  geographyObject: FeatureCollection | Topology,
  prepared: PreparedFeature[],
  pathFunctionToken: string,
): void {
  if (!CACHE_CONFIG.ENABLE_WEAKMAP_CACHE) return;

  weakMapCaches.preparedFeaturesCache.set(geographyObject, {
    prepared,
    pathFunction: pathFunctionToken,
    timestamp: Date.now(),
  });
}

/**
 * Aggressive coordinate transformation caching
 */
export function getCachedCoordinateTransform(
  transformObject: object,
  key: string,
): unknown {
  if (!CACHE_CONFIG.ENABLE_COORDINATE_CACHE) return null;

  const cache = weakMapCaches.coordinateTransformCache.get(transformObject);
  return cache?.get(key) || null;
}

/**
 * Cache coordinate transformation
 */
export function cacheCoordinateTransform(
  transformObject: object,
  key: string,
  value: unknown,
): void {
  if (!CACHE_CONFIG.ENABLE_COORDINATE_CACHE) return;

  let cache = weakMapCaches.coordinateTransformCache.get(transformObject);
  if (!cache) {
    cache = new Map();
    weakMapCaches.coordinateTransformCache.set(transformObject, cache);
  }

  // Limit cache size per object
  if (cache.size >= CACHE_CONFIG.MAX_SIZES.coordinates) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }

  cache.set(key, value);
}

/**
 * Clear all aggressive caches
 */
export function clearAggressiveCaches(): void {
  // Clear WeakMap caches (they'll be garbage collected when objects are released)
  // We can't directly clear WeakMaps, but we can create new ones
  weakMapCaches.geographyDataCache = new WeakMap();
  weakMapCaches.preparedFeaturesCache = new WeakMap();
  weakMapCaches.coordinateTransformCache = new WeakMap();

  // Clear LRU caches
  geographyCache.features.clear();
  geographyCache.preparedFeatures.clear();
  geographyCache.meshData.clear();
}

// Get cache statistics for debugging
export function getCacheStats(): {
  features: number;
  preparedFeatures: number;
  meshData: number;
  config: typeof CACHE_CONFIG;
} {
  return {
    features: geographyCache.features.size(),
    preparedFeatures: geographyCache.preparedFeatures.size(),
    meshData: geographyCache.meshData.size(),
    config: CACHE_CONFIG,
  };
}

// Get cache performance metrics
export function getCacheMetrics(): {
  features: CacheMetrics;
  preparedFeatures: CacheMetrics;
  meshData: CacheMetrics;
} {
  const calculateHitRate = (hits: number, misses: number) => {
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  };

  return {
    features: {
      ...cacheMetrics.features,
      hitRate: calculateHitRate(
        cacheMetrics.features.hits,
        cacheMetrics.features.misses,
      ),
    },
    preparedFeatures: {
      ...cacheMetrics.preparedFeatures,
      hitRate: calculateHitRate(
        cacheMetrics.preparedFeatures.hits,
        cacheMetrics.preparedFeatures.misses,
      ),
    },
    meshData: {
      ...cacheMetrics.meshData,
      hitRate: calculateHitRate(
        cacheMetrics.meshData.hits,
        cacheMetrics.meshData.misses,
      ),
    },
  };
}
