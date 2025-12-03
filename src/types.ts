import { ReactNode, SVGProps, CSSProperties } from 'react';
import { GeoPath, GeoProjection } from 'd3-geo';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import { Topology } from 'topojson-specification';

// Modern React patterns types
export type ErrorBoundaryFallback = (
  error: Error,
  retry: () => void,
) => ReactNode;

// Branded types for better type safety
export type Longitude = number & { __brand: 'longitude' };
export type Latitude = number & { __brand: 'latitude' };
export type Coordinates = [Longitude, Latitude];

// Additional branded types for specific coordinate patterns
export type ScaleExtent = [number, number] & { __brand: 'scaleExtent' };
export type TranslateExtent = [Coordinates, Coordinates] & {
  __brand: 'translateExtent';
};
export type RotationAngles = [number, number, number] & {
  __brand: 'rotationAngles';
};
export type Parallels = [number, number] & { __brand: 'parallels' };
export type GraticuleStep = [number, number] & { __brand: 'graticuleStep' };

// Helper functions to create branded types
export const createLongitude = (value: number): Longitude => value as Longitude;
export const createLatitude = (value: number): Latitude => value as Latitude;
export const createCoordinates = (lon: number, lat: number): Coordinates => [
  createLongitude(lon),
  createLatitude(lat),
];
export const createScaleExtent = (min: number, max: number): ScaleExtent =>
  [min, max] as ScaleExtent;
export const createTranslateExtent = (
  topLeft: Coordinates,
  bottomRight: Coordinates,
): TranslateExtent => [topLeft, bottomRight] as TranslateExtent;
export const createRotationAngles = (
  x: number,
  y: number,
  z: number,
): RotationAngles => [x, y, z] as RotationAngles;
export const createParallels = (p1: number, p2: number): Parallels =>
  [p1, p2] as Parallels;
export const createGraticuleStep = (x: number, y: number): GraticuleStep =>
  [x, y] as GraticuleStep;

// Convenience functions for ZoomableGroup configuration
export const createZoomConfig = (minZoom: number, maxZoom: number) => ({
  minZoom,
  maxZoom,
  scaleExtent: createScaleExtent(minZoom, maxZoom),
  enableZoom: true,
});

export const createPanConfig = (bounds: [Coordinates, Coordinates]) => ({
  translateExtent: createTranslateExtent(bounds[0], bounds[1]),
  enablePan: true,
});

export const createZoomPanConfig = (
  minZoom: number,
  maxZoom: number,
  bounds: [Coordinates, Coordinates],
) => ({
  ...createZoomConfig(minZoom, maxZoom),
  ...createPanConfig(bounds),
});

// Conditional types for enhanced component APIs
export type ConditionalProps<T, K extends keyof T> = T[K] extends undefined
  ? Partial<T>
  : Required<T>;

// Style variant conditional types
export type StyleVariant = 'default' | 'hover' | 'pressed' | 'focused';
export type ConditionalStyle<T = CSSProperties> = {
  [K in StyleVariant]?: T;
};

// Geography props with conditional error handling
export type GeographyPropsWithErrorHandling<T extends boolean> = T extends true
  ? {
      errorBoundary: true;
      onGeographyError: (error: Error) => void;
      fallback: ErrorBoundaryFallback;
    }
  : {
      errorBoundary?: false;
      onGeographyError?: (error: Error) => void;
      fallback?: never;
    };

// Zoom behavior conditional props
export type ZoomBehaviorProps<T extends boolean> = T extends true
  ? {
      enableZoom: true;
      minZoom: number;
      maxZoom: number;
      scaleExtent: ScaleExtent;
    }
  : {
      enableZoom?: false;
      minZoom?: never;
      maxZoom?: never;
      scaleExtent?: never;
    };

// Pan behavior conditional props
export type PanBehaviorProps<T extends boolean> = T extends true
  ? {
      enablePan: true;
      translateExtent: TranslateExtent;
    }
  : {
      enablePan?: false;
      translateExtent?: never;
    };

// Projection configuration conditional types
export type ProjectionConfigConditional<T extends string> =
  T extends 'geoAlbers'
    ? ProjectionConfig & Required<Pick<ProjectionConfig, 'parallels'>>
    : T extends 'geoConicEqualArea' | 'geoConicConformal'
      ? ProjectionConfig & Required<Pick<ProjectionConfig, 'parallels'>>
      : ProjectionConfig;

// Utility types for better type inference
export type ExtractStyleVariant<T> =
  T extends ConditionalStyle<infer U> ? U : never;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Type guards for runtime type checking
export type TypeGuard<T> = (value: unknown) => value is T;

// Enhanced error types for better error handling
export type GeographyError = Error & {
  type:
    | 'GEOGRAPHY_LOAD_ERROR'
    | 'GEOGRAPHY_PARSE_ERROR'
    | 'PROJECTION_ERROR'
    | 'VALIDATION_ERROR'
    | 'SECURITY_ERROR'
    | 'CONFIGURATION_ERROR'
    | 'CONTEXT_ERROR';
  geography?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
};

// Template literal types for projections
export type ProjectionName = `geo${Capitalize<string>}`;

// Base types
export interface ProjectionConfig {
  center?: Coordinates;
  rotate?: RotationAngles;
  scale?: number;
  parallels?: Parallels;
}

export interface MapContextType {
  width: number;
  height: number;
  projection: GeoProjection;
  path: GeoPath;
}

export interface ZoomPanContextType {
  x: number;
  y: number;
  k: number;
  transformString: string;
}

// Enhanced Component Props with conditional types
export interface ComposableMapProps<
  P extends string = string,
  M extends boolean = false,
> extends SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  projection?: ProjectionName | P | GeoProjection;
  projectionConfig?: ProjectionConfigConditional<P>;
  className?: string;
  children?: ReactNode;

  // Modern React patterns
  onGeographyError?: (error: Error) => void;
  fallback?: ReactNode;

  // Debug mode - opt-in debugging (quiet by default)
  debug?: boolean;

  // Conditional metadata support
  metadata?: M extends true
    ? Required<{
        title: string;
        description: string;
        keywords: string[];
        author?: string;
        canonicalUrl?: string;
      }>
    : {
        title?: string;
        description?: string;
        keywords?: string[];
        author?: string;
        canonicalUrl?: string;
      };
}

export type GeographiesProps<E extends boolean = false> = Omit<
  SVGProps<SVGGElement>,
  'children' | 'onError'
> &
  GeographyPropsWithErrorHandling<E> & {
    geography: string | Topology | FeatureCollection;
    children: (props: {
      geographies: Feature<Geometry>[];
      outline: string;
      borders: string;
      path: GeoPath;
      projection: GeoProjection;
    }) => ReactNode;
    parseGeographies?: (
      geographies: Feature<Geometry>[],
    ) => Feature<Geometry>[];
    className?: string;
  };

// Enhanced Geography event handlers with geographic data
export interface GeographyEventData {
  geography: Feature<Geometry>;
  centroid: Coordinates | null;
  bounds: [Coordinates, Coordinates] | null;
  coordinates: Coordinates | null;
}

export interface GeographyProps extends Omit<
  SVGProps<SVGPathElement>,
  | 'style'
  | 'onClick'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onMouseDown'
  | 'onMouseUp'
  | 'onFocus'
  | 'onBlur'
> {
  geography: Feature<Geometry>;
  // Enhanced event handlers with geographic data (backward compatible)
  onClick?: (
    event: React.MouseEvent<SVGPathElement>,
    data?: GeographyEventData,
  ) => void;
  onMouseEnter?: (
    event: React.MouseEvent<SVGPathElement>,
    data?: GeographyEventData,
  ) => void;
  onMouseLeave?: (
    event: React.MouseEvent<SVGPathElement>,
    data?: GeographyEventData,
  ) => void;
  onMouseDown?: (
    event: React.MouseEvent<SVGPathElement>,
    data?: GeographyEventData,
  ) => void;
  onMouseUp?: (
    event: React.MouseEvent<SVGPathElement>,
    data?: GeographyEventData,
  ) => void;
  onFocus?: (
    event: React.FocusEvent<SVGPathElement>,
    data?: GeographyEventData,
  ) => void;
  onBlur?: (
    event: React.FocusEvent<SVGPathElement>,
    data?: GeographyEventData,
  ) => void;
  style?: ConditionalStyle<CSSProperties>;
  className?: string;
}

export type ZoomableGroupProps<
  Z extends boolean = true,
  P extends boolean = true,
> = SVGProps<SVGGElement> &
  ZoomBehaviorProps<Z> &
  PanBehaviorProps<P> & {
    center?: Coordinates;
    zoom?: number;
    filterZoomEvent?: (event: Event) => boolean;
    onMoveStart?: (position: Position, event: Event) => void;
    onMove?: (position: Position, event: Event) => void;
    onMoveEnd?: (position: Position, event: Event) => void;
    className?: string;
    children?: ReactNode;
  };

// Simplified ZoomableGroup interface for easier usage
export interface SimpleZoomableGroupProps extends SVGProps<SVGGElement> {
  center?: Coordinates;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  translateExtent?: TranslateExtent;
  scaleExtent?: ScaleExtent;
  enableZoom?: boolean;
  enablePan?: boolean;
  filterZoomEvent?: (event: Event) => boolean;
  onMoveStart?: (position: Position, event: Event) => void;
  onMove?: (position: Position, event: Event) => void;
  onMoveEnd?: (position: Position, event: Event) => void;
  className?: string;
  children?: ReactNode;
}

// Union type for ZoomableGroup component props - supports both APIs
export type ZoomableGroupPropsUnion =
  | ZoomableGroupProps<true, true> // Complex API with zoom and pan
  | ZoomableGroupProps<true, false> // Complex API with zoom only
  | ZoomableGroupProps<false, true> // Complex API with pan only
  | ZoomableGroupProps<false, false> // Complex API with neither
  | SimpleZoomableGroupProps; // Simple API

export interface MarkerProps extends Omit<SVGProps<SVGGElement>, 'style'> {
  coordinates: Coordinates;
  onMouseEnter?: (event: React.MouseEvent<SVGGElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<SVGGElement>) => void;
  onMouseDown?: (event: React.MouseEvent<SVGGElement>) => void;
  onMouseUp?: (event: React.MouseEvent<SVGGElement>) => void;
  onFocus?: (event: React.FocusEvent<SVGGElement>) => void;
  onBlur?: (event: React.FocusEvent<SVGGElement>) => void;
  style?: ConditionalStyle<CSSProperties>;
  className?: string;
  children?: ReactNode;
}

export interface LineProps extends Omit<
  SVGProps<SVGPathElement>,
  'from' | 'to'
> {
  from: Coordinates;
  to: Coordinates;
  coordinates?: Coordinates[];
  className?: string;
}

export interface AnnotationProps extends SVGProps<SVGGElement> {
  subject: Coordinates;
  dx?: number;
  dy?: number;
  curve?: number;
  connectorProps?: SVGProps<SVGPathElement>;
  className?: string;
  children?: ReactNode;
}

export interface GraticuleProps extends SVGProps<SVGPathElement> {
  step?: GraticuleStep;
  className?: string;
}

export interface SphereProps extends SVGProps<SVGPathElement> {
  id?: string;
  className?: string;
}

// Hook Props
export interface UseGeographiesProps {
  geography: string | Topology | FeatureCollection;
  parseGeographies?: (geographies: Feature<Geometry>[]) => Feature<Geometry>[];
}

export interface UseZoomPanProps {
  center: Coordinates;
  zoom: number;
  scaleExtent: ScaleExtent;
  translateExtent?: TranslateExtent;
  filterZoomEvent?: (event: Event) => boolean;
  onMoveStart?: (position: Position, event: Event) => void;
  onMove?: (position: Position, event: Event) => void;
  onMoveEnd?: (position: Position, event: Event) => void;
}

// Utility types
export interface PreparedFeature extends Feature<Geometry> {
  svgPath: string;
  rsmKey: string;
}

export interface GeographyData {
  geographies: PreparedFeature[];
  outline: string;
  borders: string;
  center?: Coordinates; // Use branded type for center coordinates
}

export interface ZoomPanState {
  x: number;
  y: number;
  k: number;
}

export interface Position {
  coordinates: Coordinates;
  zoom: number;
}

// Modern React patterns interfaces
export interface GeographyErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

// Security configuration interfaces
export interface SRIConfig {
  algorithm: 'sha256' | 'sha384' | 'sha512';
  hash: string;
  enforceIntegrity: boolean;
}

export interface GeographySecurityConfig {
  ALLOW_LOCALHOST?: boolean;
  ALLOWED_PROTOCOLS?: string[];
  MAX_FILE_SIZE?: number;
  MAX_RESPONSE_SIZE?: number;
  TIMEOUT_MS?: number;
  STRICT_HTTPS_ONLY?: boolean;
  ALLOWED_CONTENT_TYPES?: string[];
  ALLOW_HTTP_LOCALHOST?: boolean;
}

// Server Component compatible geography props
export interface GeographyServerProps {
  geography: string;
  children: (data: GeographyData) => ReactNode;
  cache?: boolean;
}
