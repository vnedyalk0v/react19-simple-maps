import React, { createContext, useMemo, useContext, ReactNode } from 'react';
import * as d3Geo from 'd3-geo';
import { GeoProjection } from 'd3-geo';
import { MapContextType, ProjectionConfig } from '../types';
import { createGeographyError } from '../utils';
import { validateProjectionConfig } from '../utils/input-validation';

const { geoPath, ...projections } = d3Geo;

const MapContext = createContext<MapContextType | undefined>(undefined);
const EMPTY_PROJECTION_CONFIG: ProjectionConfig = Object.freeze({});

interface MakeProjectionParams {
  projectionConfig?: ProjectionConfig;
  projection: string | GeoProjection;
  width: number;
  height: number;
}

const makeProjection = ({
  projectionConfig = EMPTY_PROJECTION_CONFIG,
  projection = 'geoEqualEarth',
  width = 800,
  height = 600,
}: MakeProjectionParams): GeoProjection => {
  const isFunc = typeof projection === 'function';

  if (isFunc) return projection as GeoProjection;

  const trimmedProjection = projection.trim();
  if (!trimmedProjection) {
    throw createGeographyError(
      'PROJECTION_ERROR',
      'Projection name must be a non-empty string',
    );
  }

  if (!/^geo[A-Za-z0-9]+$/.test(trimmedProjection)) {
    throw createGeographyError(
      'PROJECTION_ERROR',
      `Invalid projection name: ${trimmedProjection}`,
    );
  }

  // Validate projection configuration
  const validatedConfig = validateProjectionConfig(projectionConfig);

  const projectionName = trimmedProjection as keyof typeof projections;
  if (!(projectionName in projections)) {
    throw createGeographyError(
      'PROJECTION_ERROR',
      `Unknown projection: ${trimmedProjection}`,
      undefined,
      { availableProjections: Object.keys(projections) },
    );
  }

  let proj = (projections[projectionName] as () => GeoProjection)().translate([
    width / 2,
    height / 2,
  ]);

  // Apply validated projection configuration
  if (validatedConfig.center && proj.center) {
    proj = proj.center(validatedConfig.center);
  }
  if (validatedConfig.rotate && proj.rotate) {
    proj = proj.rotate(validatedConfig.rotate);
  }
  if (validatedConfig.scale && proj.scale) {
    proj = proj.scale(validatedConfig.scale);
  }

  return proj;
};

interface MapProviderProps {
  width: number;
  height: number;
  projection?: string | GeoProjection;
  projectionConfig?: ProjectionConfig;
  children: ReactNode;
}

const MapProvider: React.FC<MapProviderProps> = ({
  width,
  height,
  projection,
  projectionConfig = EMPTY_PROJECTION_CONFIG,
  children,
}) => {
  const projMemo = useMemo(() => {
    return makeProjection({
      projectionConfig,
      projection: projection || 'geoEqualEarth',
      width,
      height,
    });
  }, [width, height, projection, projectionConfig]);

  const value = useMemo((): MapContextType => {
    return {
      width,
      height,
      projection: projMemo,
      path: geoPath().projection(projMemo),
    };
  }, [width, height, projMemo]);

  return <MapContext value={value}>{children}</MapContext>;
};

const useMapContext = (): MapContextType => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw createGeographyError(
      'CONTEXT_ERROR',
      'useMapContext must be used within a MapProvider',
    );
  }
  return context;
};

export { MapProvider, MapContext, useMapContext };
