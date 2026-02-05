import { ReactNode, SVGProps, CSSProperties } from 'react';
import { GeoPath, GeoProjection } from 'd3-geo';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import { Topology } from 'topojson-specification';
export type ErrorBoundaryFallback = (error: Error, retry: () => void) => ReactNode;
export type Longitude = number & {
    __brand: 'longitude';
};
export type Latitude = number & {
    __brand: 'latitude';
};
export type Coordinates = [Longitude, Latitude];
export type ScaleExtent = [number, number] & {
    __brand: 'scaleExtent';
};
export type TranslateExtent = [Coordinates, Coordinates] & {
    __brand: 'translateExtent';
};
export type RotationAngles = [number, number, number] & {
    __brand: 'rotationAngles';
};
export type Parallels = [number, number] & {
    __brand: 'parallels';
};
export type GraticuleStep = [number, number] & {
    __brand: 'graticuleStep';
};
export declare const createLongitude: (value: number) => Longitude;
export declare const createLatitude: (value: number) => Latitude;
export declare const createCoordinates: (lon: number, lat: number) => Coordinates;
export declare const createScaleExtent: (min: number, max: number) => ScaleExtent;
export declare const createTranslateExtent: (topLeft: Coordinates, bottomRight: Coordinates) => TranslateExtent;
export declare const createRotationAngles: (x: number, y: number, z: number) => RotationAngles;
export declare const createParallels: (p1: number, p2: number) => Parallels;
export declare const createGraticuleStep: (x: number, y: number) => GraticuleStep;
export declare const createZoomConfig: (minZoom: number, maxZoom: number) => {
    minZoom: number;
    maxZoom: number;
    scaleExtent: ScaleExtent;
    enableZoom: boolean;
};
export declare const createPanConfig: (bounds: [Coordinates, Coordinates]) => {
    translateExtent: TranslateExtent;
    enablePan: boolean;
};
export declare const createZoomPanConfig: (minZoom: number, maxZoom: number, bounds: [Coordinates, Coordinates]) => {
    translateExtent: TranslateExtent;
    enablePan: boolean;
    minZoom: number;
    maxZoom: number;
    scaleExtent: ScaleExtent;
    enableZoom: boolean;
};
export type ConditionalProps<T, K extends keyof T> = T[K] extends undefined ? Partial<T> : Required<T>;
export type StyleVariant = 'default' | 'hover' | 'pressed' | 'focused';
export type ConditionalStyle<T = CSSProperties> = {
    [K in StyleVariant]?: T;
};
export type GeographyPropsWithErrorHandling<T extends boolean> = T extends true ? {
    errorBoundary: true;
    onGeographyError: (error: Error) => void;
    fallback: ErrorBoundaryFallback;
} : {
    errorBoundary?: false;
    onGeographyError?: (error: Error) => void;
    fallback?: never;
};
export type ZoomBehaviorProps<T extends boolean> = T extends true ? {
    enableZoom: true;
    minZoom: number;
    maxZoom: number;
    scaleExtent: ScaleExtent;
} : {
    enableZoom?: false;
    minZoom?: never;
    maxZoom?: never;
    scaleExtent?: never;
};
export type PanBehaviorProps<T extends boolean> = T extends true ? {
    enablePan: true;
    translateExtent: TranslateExtent;
} : {
    enablePan?: false;
    translateExtent?: never;
};
export type ProjectionConfigConditional<T extends string> = T extends 'geoAlbers' ? ProjectionConfig & Required<Pick<ProjectionConfig, 'parallels'>> : T extends 'geoConicEqualArea' | 'geoConicConformal' ? ProjectionConfig & Required<Pick<ProjectionConfig, 'parallels'>> : ProjectionConfig;
export type ExtractStyleVariant<T> = T extends ConditionalStyle<infer U> ? U : never;
export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
export type OptionalKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];
export type TypeGuard<T> = (value: unknown) => value is T;
export type GeographyError = Error & {
    type: 'GEOGRAPHY_LOAD_ERROR' | 'GEOGRAPHY_PARSE_ERROR' | 'PROJECTION_ERROR' | 'VALIDATION_ERROR' | 'SECURITY_ERROR' | 'CONFIGURATION_ERROR' | 'CONTEXT_ERROR';
    geography?: string;
    details?: Record<string, unknown>;
    timestamp?: string;
};
export type ProjectionName = `geo${Capitalize<string>}`;
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
export interface ComposableMapProps<P extends string = string, M extends boolean = false> extends SVGProps<SVGSVGElement> {
    width?: number;
    height?: number;
    projection?: ProjectionName | P | GeoProjection;
    projectionConfig?: ProjectionConfigConditional<P>;
    className?: string;
    children?: ReactNode;
    onGeographyError?: (error: Error) => void;
    fallback?: ReactNode;
    debug?: boolean;
    metadata?: M extends true ? Required<{
        title: string;
        description: string;
        keywords: string[];
        author?: string;
        canonicalUrl?: string;
    }> : {
        title?: string;
        description?: string;
        keywords?: string[];
        author?: string;
        canonicalUrl?: string;
    };
}
export type GeographiesProps<E extends boolean = false> = Omit<SVGProps<SVGGElement>, 'children' | 'onError'> & GeographyPropsWithErrorHandling<E> & {
    geography: string | Topology | FeatureCollection;
    children: (props: {
        geographies: Feature<Geometry>[];
        outline: string;
        borders: string;
        path: GeoPath;
        projection: GeoProjection;
    }) => ReactNode;
    parseGeographies?: (geographies: Feature<Geometry>[]) => Feature<Geometry>[];
    className?: string;
};
export interface GeographyEventData {
    geography: Feature<Geometry>;
    centroid: Coordinates | null;
    bounds: [Coordinates, Coordinates] | null;
    coordinates: Coordinates | null;
}
export interface GeographyProps extends Omit<SVGProps<SVGPathElement>, 'style' | 'onClick' | 'onMouseEnter' | 'onMouseLeave' | 'onMouseDown' | 'onMouseUp' | 'onFocus' | 'onBlur'> {
    geography: Feature<Geometry>;
    onClick?: (event: React.MouseEvent<SVGPathElement>, data?: GeographyEventData) => void;
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>, data?: GeographyEventData) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>, data?: GeographyEventData) => void;
    onMouseDown?: (event: React.MouseEvent<SVGPathElement>, data?: GeographyEventData) => void;
    onMouseUp?: (event: React.MouseEvent<SVGPathElement>, data?: GeographyEventData) => void;
    onFocus?: (event: React.FocusEvent<SVGPathElement>, data?: GeographyEventData) => void;
    onBlur?: (event: React.FocusEvent<SVGPathElement>, data?: GeographyEventData) => void;
    style?: ConditionalStyle<CSSProperties>;
    className?: string;
}
export type ZoomableGroupProps<Z extends boolean = true, P extends boolean = true> = SVGProps<SVGGElement> & ZoomBehaviorProps<Z> & PanBehaviorProps<P> & {
    center?: Coordinates;
    zoom?: number;
    filterZoomEvent?: (event: Event) => boolean;
    onMoveStart?: (position: Position, event: Event) => void;
    onMove?: (position: Position, event: Event) => void;
    onMoveEnd?: (position: Position, event: Event) => void;
    className?: string;
    children?: ReactNode;
};
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
export type ZoomableGroupPropsUnion = ZoomableGroupProps<true, true> | ZoomableGroupProps<true, false> | ZoomableGroupProps<false, true> | ZoomableGroupProps<false, false> | SimpleZoomableGroupProps;
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
export interface LineProps extends Omit<SVGProps<SVGPathElement>, 'from' | 'to'> {
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
export interface PreparedFeature extends Feature<Geometry> {
    svgPath: string;
    rsmKey: string;
}
export interface GeographyData {
    geographies: PreparedFeature[];
    outline: string;
    borders: string;
    center?: Coordinates;
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
export interface GeographyErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, retry: () => void) => ReactNode;
    onError?: (error: Error) => void;
}
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
export interface GeographyServerProps {
    geography: string;
    children: (data: GeographyData) => ReactNode;
    cache?: boolean;
}
//# sourceMappingURL=types.d.ts.map