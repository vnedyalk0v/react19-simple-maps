import { cache, ReactNode, useMemo } from 'react';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import { Topology } from 'topojson-specification';
import { GeographyData } from '../../types';
import {
  getFeatures,
  getMesh,
  prepareFeatures,
  prepareMesh,
} from '../../utils';
import { useMapContext } from '../MapProvider';
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
} from '../../utils/geography-cache';

type ParseGeographiesFunction = (
  geographies: Feature<Geometry>[],
) => Feature<Geometry>[];

// Cache geography fetching for Server Components with security measures
const preloadGeography = cache(
  async (geography: string): Promise<Topology | FeatureCollection> => {
    // Reuse the secure fetchGeographiesCache implementation
    // Import the secure function from utils
    const { fetchGeographiesCache } = await import('../../utils');

    // Use the secure implementation
    return fetchGeographiesCache(geography);
  },
);

interface GeographyServerProps {
  geography: string;
  children: (data: GeographyData) => ReactNode;
  parseGeographies?: ParseGeographiesFunction;
}

interface GeographyProcessorProps {
  geographyData: Topology | FeatureCollection;
  parseGeographies?: ParseGeographiesFunction;
  children: (data: GeographyData) => ReactNode;
}

// Internal component that processes geography data with map context
function GeographyProcessor({
  geographyData,
  parseGeographies,
  children,
}: GeographyProcessorProps) {
  const { path } = useMapContext();

  // Memoize feature extraction with caching for performance
  const features = useMemo(() => {
    const cacheKey = generateFeaturesCacheKey(geographyData, parseGeographies);
    const cached = getCachedFeatures(cacheKey);

    if (cached) {
      return cached;
    }

    const extractedFeatures = getFeatures(geographyData, parseGeographies);
    cacheFeatures(cacheKey, extractedFeatures);
    return extractedFeatures;
  }, [geographyData, parseGeographies]);

  // Memoize mesh extraction separately for better granularity
  const mesh = useMemo(() => {
    return getMesh(geographyData);
  }, [geographyData]);

  // Memoize prepared features with caching (path generation is expensive)
  const preparedGeographies = useMemo(() => {
    if (features.length === 0) return [];

    const cacheKey = generatePreparedFeaturesCacheKey(features, path);
    const cached = getCachedPreparedFeatures(cacheKey);

    if (cached) {
      return cached;
    }

    const prepared = prepareFeatures(features, path);
    cachePreparedFeatures(cacheKey, prepared);
    return prepared;
  }, [features, path]);

  // Memoize prepared mesh with caching (path generation for borders/outline)
  const preparedMeshData = useMemo(() => {
    if (!mesh) return { outline: '', borders: '' };

    const cacheKey = generateMeshCacheKey(geographyData, path);
    const cached = getCachedMeshData(cacheKey);

    if (cached) {
      return cached;
    }

    const prepared = prepareMesh(
      mesh.outline || null,
      mesh.borders || null,
      path,
    );

    const result = {
      outline: prepared.outline || '',
      borders: prepared.borders || '',
    };

    cacheMeshData(cacheKey, result);
    return result;
  }, [mesh, path, geographyData]);

  // Memoize the final processed data object
  const processedData: GeographyData = useMemo(
    () => ({
      geographies: preparedGeographies,
      outline: preparedMeshData.outline,
      borders: preparedMeshData.borders,
      isLoading: false,
      error: null,
    }),
    [preparedGeographies, preparedMeshData],
  );

  return children(processedData);
}

// Server Component for pre-loading geography data
export async function GeographyServer({
  geography,
  children,
  parseGeographies,
}: GeographyServerProps) {
  const geographyData = await preloadGeography(geography);

  // Return the raw geography data to be processed by the client component
  return (
    <GeographyProcessor
      geographyData={geographyData}
      {...(parseGeographies && { parseGeographies })}
    >
      {children}
    </GeographyProcessor>
  );
}

// Export the processor for use by client components
export { GeographyProcessor };

// Export types for external use
export type { GeographyServerProps, ParseGeographiesFunction };

export default GeographyServer;
