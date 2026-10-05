import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';

// Geography data type guards
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArrayOf(
  value: unknown,
  predicate: (item: unknown) => boolean,
): boolean {
  if (!Array.isArray(value)) return false;
  for (const item of value) {
    if (!predicate(item)) return false;
  }
  return true;
}

function isPosition(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    isArrayOf(
      value,
      (item) => typeof item === 'number' && Number.isFinite(item),
    )
  );
}

function isLineStringCoordinates(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    (value.length === 0 || value.length >= 2) &&
    isArrayOf(value, isPosition)
  );
}

function isLinearRing(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 4) return false;
  const first: unknown = value[0];
  const last: unknown = value[value.length - 1];
  return (
    isPosition(first) &&
    isPosition(last) &&
    first.length === last.length &&
    first.every((coordinate, index) => coordinate === last[index]) &&
    isArrayOf(value, isPosition)
  );
}

function isNestedArray(
  value: unknown,
  depth: number,
  predicate: (item: unknown) => boolean,
): boolean {
  return depth === 0
    ? predicate(value)
    : isArrayOf(value, (item) => isNestedArray(item, depth - 1, predicate));
}

function hasValidProperties(
  value: Record<string, unknown>,
  allowMissingProperties = false,
): boolean {
  return (
    ((allowMissingProperties && value.properties === undefined) ||
      value.properties === null ||
      isRecord(value.properties)) &&
    (value.id === undefined ||
      typeof value.id === 'string' ||
      typeof value.id === 'number')
  );
}

function isGeometry(
  value: unknown,
  topologyArcs?: readonly unknown[][],
): boolean {
  const ancestors = new Set<object>();
  const stack: Array<{ geometry: unknown; exit?: boolean }> = [
    { geometry: value },
  ];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame || !isRecord(frame.geometry)) return false;
    const geometry = frame.geometry;
    if (frame.exit) {
      ancestors.delete(geometry);
      continue;
    }
    if (ancestors.has(geometry)) return false;
    if (topologyArcs !== undefined && !hasValidProperties(geometry, true)) {
      return false;
    }
    if (geometry.type === 'GeometryCollection') {
      if (!Array.isArray(geometry.geometries)) return false;
      ancestors.add(geometry);
      stack.push({ geometry, exit: true });
      for (const child of geometry.geometries) {
        stack.push({ geometry: child });
      }
    } else if (!isLeafGeometry(geometry, topologyArcs)) {
      return false;
    }
  }
  return true;
}

function isLeafGeometry(
  value: Record<string, unknown>,
  topologyArcs?: readonly unknown[][],
): boolean {
  if (topologyArcs !== undefined && value.type === null) return true;

  let depth: number;
  switch (value.type) {
    case 'Point':
      return isPosition(value.coordinates);
    case 'MultiPoint':
      return isArrayOf(value.coordinates, isPosition);
    case 'LineString':
      depth = 1;
      break;
    case 'Polygon':
    case 'MultiLineString':
      depth = 2;
      break;
    case 'MultiPolygon':
      depth = 3;
      break;
    default:
      return false;
  }

  if (topologyArcs === undefined) {
    if (value.type === 'Polygon' || value.type === 'MultiPolygon') {
      return isNestedArray(value.coordinates, depth - 1, isLinearRing);
    }
    return isNestedArray(value.coordinates, depth - 1, isLineStringCoordinates);
  }
  return isNestedArray(
    value.arcs,
    depth - 1,
    (indexes) =>
      Array.isArray(indexes) &&
      indexes.length > 0 &&
      isArrayOf(indexes, (index) => {
        if (typeof index !== 'number' || !Number.isInteger(index)) return false;
        const arcIndex = index < 0 ? -index - 1 : index;
        return (topologyArcs[arcIndex]?.length ?? 0) > 0;
      }),
  );
}

export function isTopology(value: unknown): value is Topology {
  if (!isRecord(value) || value.type !== 'Topology') return false;
  if (
    !isRecord(value.objects) ||
    !isArrayOf(value.arcs, (arc) => isArrayOf(arc, isPosition))
  ) {
    return false;
  }
  const topologyArcs = value.arcs as unknown[][];
  if (
    value.transform !== undefined &&
    (!isRecord(value.transform) ||
      !isPosition(value.transform.scale) ||
      (value.transform.scale as unknown[]).length !== 2 ||
      !isPosition(value.transform.translate) ||
      (value.transform.translate as unknown[]).length !== 2)
  ) {
    return false;
  }
  return Object.values(value.objects).every((geometry) =>
    isGeometry(geometry, topologyArcs),
  );
}

function isFeatureCollectionData(
  value: unknown,
  allowNullGeometry = false,
): boolean {
  return (
    isRecord(value) &&
    value.type === 'FeatureCollection' &&
    isArrayOf(value.features, (feature) =>
      isFeatureData(feature, allowNullGeometry),
    )
  );
}

function isFeatureData(value: unknown, allowNullGeometry = false): boolean {
  return (
    isRecord(value) &&
    value.type === 'Feature' &&
    hasValidProperties(value) &&
    ((allowNullGeometry && value.geometry === null) ||
      isValidGeometry(value.geometry))
  );
}

export function isFeatureCollection(
  value: unknown,
): value is FeatureCollection {
  return isFeatureCollectionData(value);
}

export function isFeature(value: unknown): value is Feature<Geometry> {
  return isFeatureData(value);
}

export function isValidGeometry(value: unknown): value is Geometry {
  return isGeometry(value);
}

export function isValidGeographyData(
  value: unknown,
): value is Topology | FeatureCollection {
  return isTopology(value) || isFeatureCollection(value);
}

// URL-loaded GeoJSON may contain RFC 7946 null geometries, which d3 skips.
// Keep the public guards strict for their non-null Feature<Geometry> types.
export function isValidFetchedGeographyData(value: unknown): boolean {
  return isTopology(value) || isFeatureCollectionData(value, true);
}
