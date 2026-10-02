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
  // Every geography change or refetch starts a new request, and only that
  // request's result is shown, so an earlier result (for this or another URL)
  // never looks current while a newer request is pending.
  const [request, setRequest] = useState({ geography, id: 0 });
  if (request.geography !== geography) {
    setRequest({ geography, id: request.id + 1 });
  }
  const [result, setResult] = useState<{
    id: number;
    data?: Topology | FeatureCollection;
    error?: GeographyError | Error;
  } | null>(null);

  const refetch = useCallback(() => {
    setRequest((r) => ({ ...r, id: r.id + 1 }));
  }, []);

  const requestId = request.id;
  useEffect(() => {
    if (!isString(geography)) return;

    let ignore = false;

    devTools.debugGeographyLoading(geography, 'start');

    preloadGeography(geography);

    fetchGeographiesCache(geography).then(
      (data) => {
        if (ignore) return;
        devTools.debugGeographyLoading(geography, 'success', data);
        setResult({ id: requestId, data });
      },
      (err: unknown) => {
        if (ignore) return;
        devTools.debugGeographyLoading(geography, 'error', err);
        setResult({
          id: requestId,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      },
    );

    return () => {
      ignore = true;
    };
  }, [geography, requestId]);

  // Everything below is derived during render: inline data is available on
  // the server and first client render, and a URL is loading until the
  // current request settles.
  const isUrl = isString(geography);
  const current =
    isUrl && request.geography === geography && result?.id === requestId
      ? result
      : null;
  const data = isUrl ? (current?.data ?? null) : geography;
  const loading = isUrl && !current;
  const fetchError = current?.error ?? null;

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
