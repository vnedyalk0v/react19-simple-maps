import { useMemo, useEffect, useState, useCallback } from 'react';
import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
import { useMapContext } from './MapProvider';
import { UseGeographiesProps, GeographyData, GeographyError } from '../types';
import {
  fetchGeographiesCache,
  getFeatures,
  getMesh,
  prepareFeatures,
  isString,
  prepareMesh,
} from '../utils';
import {
  cacheFeatures,
  getCachedFeatures,
  cachePreparedFeatures,
  getCachedPreparedFeatures,
  cacheMeshData,
  getCachedMeshData,
  generateFeaturesCacheKey,
  generatePreparedFeaturesCacheKey,
  generateMeshCacheKey,
} from '../utils/geography-cache';
import { preloadGeography } from '../utils/preloading';
import { devTools } from '../utils/debugging';

export default function useGeographies({
  geography,
  parseGeographies,
}: UseGeographiesProps): GeographyData {
  const { path } = useMapContext();
  const [loadedData, setLoadedData] = useState<
    Topology | FeatureCollection | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeographyError | Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const refetch = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!isString(geography)) return;

    let ignore = false;
    setIsLoading(true);
    setError(null);

    devTools.debugGeographyLoading(geography, 'start');

    preloadGeography(geography);

    fetchGeographiesCache(geography)
      .then((result) => {
        if (!ignore) {
          devTools.debugGeographyLoading(geography, 'success', result);
          setLoadedData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          devTools.debugGeographyLoading(geography, 'error', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [geography, retryCount]);

  // Inline data is derived during render so it is available on the server and
  // on the first client render; only URLs go through the fetch Effect above.
  const isUrl = isString(geography);
  const data = isUrl ? loadedData : geography;
  const loading = isUrl && isLoading;
  const fetchError = isUrl ? error : null;

  // Granular memoization for expensive operations

  // Memoize feature extraction with aggressive caching
  const rawFeatures = useMemo(() => {
    if (loading || !data) return [];

    const cacheKey = generateFeaturesCacheKey(data, parseGeographies);
    const cached = getCachedFeatures(cacheKey);

    if (cached) {
      return cached;
    }

    // Extract features
    const features = getFeatures(data, parseGeographies);

    cacheFeatures(cacheKey, features);

    return features;
  }, [data, loading, parseGeographies]);

  // Memoize mesh extraction separately
  const rawMesh = useMemo(() => {
    if (loading || !data) return null;
    return getMesh(data);
  }, [data, loading]);

  // Memoize prepared features with aggressive caching (path generation is expensive)
  const preparedGeographies = useMemo(() => {
    if (rawFeatures.length === 0) return [];

    const cacheKey = generatePreparedFeaturesCacheKey(rawFeatures, path);
    const cached = getCachedPreparedFeatures(cacheKey);

    if (cached) {
      return cached;
    }

    // Generate prepared features
    const prepared = prepareFeatures(rawFeatures, path);

    cachePreparedFeatures(cacheKey, prepared);

    return prepared;
  }, [rawFeatures, path]);

  // Memoize prepared mesh with caching (path generation for borders/outline)
  const preparedMeshData = useMemo(() => {
    if (!rawMesh) return { outline: '', borders: '' };

    const cacheKey = generateMeshCacheKey(data, path);
    const cached = getCachedMeshData(cacheKey);

    if (cached) {
      return cached;
    }

    const prepared = prepareMesh(
      rawMesh.outline || null,
      rawMesh.borders || null,
      path,
    );

    const result = {
      outline: prepared.outline || '',
      borders: prepared.borders || '',
    };

    cacheMeshData(cacheKey, result);
    return result;
  }, [rawMesh, path, data]);

  return useMemo(() => {
    return {
      geographies: preparedGeographies,
      outline: preparedMeshData.outline,
      borders: preparedMeshData.borders,
      isLoading: loading,
      error: fetchError,
      refetch,
    };
  }, [preparedGeographies, preparedMeshData, loading, fetchError, refetch]);
}
