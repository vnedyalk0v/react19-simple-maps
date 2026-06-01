import { feature, mesh } from 'topojson-client';
import {
  Feature,
  FeatureCollection,
  Geometry,
  MultiLineString,
  LineString,
} from 'geojson';
import { Topology } from 'topojson-specification';
import { GeoPath } from 'd3-geo';
import { PreparedFeature } from '../types';

type MeshGeometry = MultiLineString | LineString;

/**
 * Checks if the input is a string (URL)
 * @param geo - Geography data or URL
 * @returns True if input is a string
 */
export function isString(
  geo: string | Topology | FeatureCollection | Feature<Geometry>[],
): geo is string {
  return typeof geo === 'string';
}

/**
 * Extracts features from topology data
 * @param topology - Topology object
 * @param parseGeographies - Optional parser function
 * @returns Array of features
 */
function extractFeaturesFromTopology(
  topology: Topology,
  parseGeographies?: (geographies: Feature<Geometry>[]) => Feature<Geometry>[],
): Feature<Geometry>[] {
  const objectKeys = Object.keys(topology.objects);
  if (objectKeys.length === 0) {
    return [];
  }

  // Get the first object (usually countries, states, etc.)
  const firstObjectKey = objectKeys[0];
  if (!firstObjectKey) {
    return [];
  }

  const geometryObject = topology.objects[firstObjectKey];
  if (!geometryObject) {
    return [];
  }

  const featureCollection = feature(topology, geometryObject);
  const features =
    'features' in featureCollection ? featureCollection.features || [] : [];
  return parseGeographies ? parseGeographies(features) : features;
}

/**
 * Extracts features from FeatureCollection
 * @param featureCollection - FeatureCollection object
 * @param parseGeographies - Optional parser function
 * @returns Array of features
 */
function extractFeaturesFromCollection(
  featureCollection: FeatureCollection,
  parseGeographies?: (geographies: Feature<Geometry>[]) => Feature<Geometry>[],
): Feature<Geometry>[] {
  const features = featureCollection.features || [];
  return parseGeographies ? parseGeographies(features) : features;
}

/**
 * Extracts features from various geography data formats
 * @param geographies - Geography data (Topology, FeatureCollection, or Feature array)
 * @param parseGeographies - Optional parser function for features
 * @returns Array of features
 */
export function getFeatures(
  geographies: Topology | FeatureCollection | Feature<Geometry>[],
  parseGeographies?: (geographies: Feature<Geometry>[]) => Feature<Geometry>[],
): Feature<Geometry>[] {
  // Handle array of features
  if (Array.isArray(geographies)) {
    return parseGeographies ? parseGeographies(geographies) : geographies;
  }

  // Handle Topology
  if (geographies.type === 'Topology') {
    return extractFeaturesFromTopology(geographies, parseGeographies);
  }

  // Handle FeatureCollection
  if (geographies.type === 'FeatureCollection') {
    return extractFeaturesFromCollection(geographies, parseGeographies);
  }

  return [];
}

/**
 * Extracts mesh data from topology for borders and outlines
 * @param topology - Topology object
 * @returns Mesh data with outline and borders, or null if not available
 */
function extractMeshFromTopology(topology: Topology): {
  outline: MeshGeometry | null;
  borders: MeshGeometry | null;
} | null {
  const objectKeys = Object.keys(topology.objects);
  if (objectKeys.length === 0) {
    return null;
  }

  const firstObjectKey = objectKeys[0];
  if (!firstObjectKey) {
    return null;
  }

  const geometryObject = topology.objects[firstObjectKey];
  if (!geometryObject) {
    return null;
  }

  try {
    // Generate outline (exterior boundaries)
    const outline = mesh(
      topology,
      geometryObject as Parameters<typeof mesh>[1],
      (a, b) => a === b,
    ) as MeshGeometry;

    // Generate borders (interior boundaries)
    const borders = mesh(
      topology,
      geometryObject as Parameters<typeof mesh>[1],
      (a, b) => a !== b,
    ) as MeshGeometry;

    return { outline, borders };
  } catch {
    return null;
  }
}

/**
 * Extracts mesh data from geography data
 * @param geographies - Geography data (only Topology supports mesh)
 * @returns Mesh data or null
 */
export function getMesh(
  geographies: Topology | FeatureCollection | Feature<Geometry>[],
): { outline: MeshGeometry | null; borders: MeshGeometry | null } | null {
  // Only Topology supports mesh generation
  if (
    geographies &&
    typeof geographies === 'object' &&
    !Array.isArray(geographies) &&
    'type' in geographies &&
    geographies.type === 'Topology'
  ) {
    return extractMeshFromTopology(geographies as Topology);
  }

  return null;
}

/**
 * Prepares mesh data by generating SVG paths
 * @param outline - Outline geometry
 * @param borders - Borders geometry
 * @param path - D3 path generator
 * @returns Object with SVG path strings
 */
export function prepareMesh(
  outline: MeshGeometry | null,
  borders: MeshGeometry | null,
  path: GeoPath,
): { outline?: string; borders?: string } {
  const result: { outline?: string; borders?: string } = {};

  if (outline) {
    const outlinePath = path(outline);
    if (outlinePath) {
      result.outline = outlinePath;
    }
  }

  if (borders) {
    const bordersPath = path(borders);
    if (bordersPath) {
      result.borders = bordersPath;
    }
  }

  return result;
}

function getExplicitFeatureKey(feature: Feature<Geometry>): string | null {
  const existingKey = (
    feature as Feature<Geometry> & { rsmKey?: string | number }
  ).rsmKey;

  if (existingKey !== undefined && existingKey !== null) {
    return String(existingKey);
  }

  if (feature.id !== undefined && feature.id !== null) {
    return String(feature.id);
  }

  return null;
}

function getUniqueFallbackRsmKey(
  index: number,
  unavailableKeys: Set<string>,
): string {
  const baseKey = `geo-${index}`;
  if (!unavailableKeys.has(baseKey)) {
    return baseKey;
  }

  let suffix = 1;
  let fallbackKey = `${baseKey}-${suffix}`;
  while (unavailableKeys.has(fallbackKey)) {
    suffix += 1;
    fallbackKey = `${baseKey}-${suffix}`;
  }

  return fallbackKey;
}

/**
 * Prepares features by generating SVG paths for each feature
 * @param features - Array of features to prepare
 * @param path - D3 path generator
 * @returns Array of prepared features with SVG paths
 */
export function prepareFeatures(
  features: Feature<Geometry>[] | undefined,
  path: GeoPath,
): PreparedFeature[] {
  if (!features || features.length === 0) {
    return [];
  }

  const preparedCandidates = features
    .map((feature, index) => {
      const svgPath = path(feature);
      if (!svgPath) {
        return null;
      }

      return {
        explicitKey: getExplicitFeatureKey(feature),
        feature,
        index,
        svgPath,
      };
    })
    .filter((feature) => feature !== null);

  const unavailableKeys = new Set(
    preparedCandidates
      .map((candidate) => candidate.explicitKey)
      .filter((rsmKey): rsmKey is string => rsmKey !== null),
  );

  return preparedCandidates.map(({ explicitKey, feature, index, svgPath }) => {
    const rsmKey =
      explicitKey ?? getUniqueFallbackRsmKey(index, unavailableKeys);
    unavailableKeys.add(rsmKey);

    return {
      ...feature,
      svgPath,
      rsmKey,
    } as PreparedFeature;
  });
}

/**
 * Creates a connector path between two coordinates
 * @param start - Starting coordinates [longitude, latitude]
 * @param end - Ending coordinates [longitude, latitude]
 * @param curve - D3 curve function for path interpolation
 * @returns SVG path string
 */
export function createConnectorPath(
  start: [number, number],
  end: [number, number],
  curve: unknown, // D3 curve type is complex, using unknown for type safety
): string {
  // Type guard for curve function
  if (typeof curve !== 'function') {
    return '';
  }

  try {
    // Use type assertion for D3 curve - this is a known external API
    const curveFactory = curve as () => {
      x: (fn: (d: [number, number]) => number) => {
        y: (
          fn: (d: [number, number]) => number,
        ) => (data: [number, number][]) => string;
      };
      y: (
        fn: (d: [number, number]) => number,
      ) => (data: [number, number][]) => string;
    };

    const line = curveFactory()
      .x((d: [number, number]) => d[0])
      .y((d: [number, number]) => d[1]);

    return line([start, end]) || '';
  } catch {
    return '';
  }
}
