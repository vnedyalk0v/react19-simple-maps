import * as react from 'react';
import react__default, { SVGProps, ReactNode, CSSProperties, Ref } from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { GeoProjection, GeoPath } from 'd3-geo';
import { FeatureCollection, Feature, Geometry } from 'geojson';
import { Topology } from 'topojson-specification';

type ErrorBoundaryFallback = (error: Error, retry: () => void) => ReactNode;
type Longitude = number & {
    __brand: 'longitude';
};
type Latitude = number & {
    __brand: 'latitude';
};
type Coordinates = [Longitude, Latitude];
type ScaleExtent = [number, number] & {
    __brand: 'scaleExtent';
};
type TranslateExtent = [Coordinates, Coordinates] & {
    __brand: 'translateExtent';
};
type RotationAngles = [number, number, number] & {
    __brand: 'rotationAngles';
};
type Parallels = [number, number] & {
    __brand: 'parallels';
};
type GraticuleStep = [number, number] & {
    __brand: 'graticuleStep';
};
declare const createLongitude: (value: number) => Longitude;
declare const createLatitude: (value: number) => Latitude;
declare const createCoordinates: (lon: number, lat: number) => Coordinates;
declare const createScaleExtent: (min: number, max: number) => ScaleExtent;
declare const createTranslateExtent: (topLeft: Coordinates, bottomRight: Coordinates) => TranslateExtent;
declare const createParallels: (p1: number, p2: number) => Parallels;
declare const createGraticuleStep: (x: number, y: number) => GraticuleStep;
declare const createZoomConfig: (minZoom: number, maxZoom: number) => {
    minZoom: number;
    maxZoom: number;
    scaleExtent: ScaleExtent;
    enableZoom: boolean;
};
declare const createPanConfig: (bounds: [Coordinates, Coordinates]) => {
    translateExtent: TranslateExtent;
    enablePan: boolean;
};
declare const createZoomPanConfig: (minZoom: number, maxZoom: number, bounds: [Coordinates, Coordinates]) => {
    translateExtent: TranslateExtent;
    enablePan: boolean;
    minZoom: number;
    maxZoom: number;
    scaleExtent: ScaleExtent;
    enableZoom: boolean;
};
type StyleVariant = 'default' | 'hover' | 'pressed' | 'focused';
type ConditionalStyle<T = CSSProperties> = {
    [K in StyleVariant]?: T;
};
type GeographyPropsWithErrorHandling<T extends boolean> = T extends true ? {
    errorBoundary: true;
    onGeographyError: (error: Error) => void;
    fallback: ErrorBoundaryFallback;
} : {
    errorBoundary?: false;
    onGeographyError?: (error: Error) => void;
    fallback?: never;
};
type ZoomBehaviorProps<T extends boolean> = T extends true ? {
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
type PanBehaviorProps<T extends boolean> = T extends true ? {
    enablePan: true;
    translateExtent: TranslateExtent;
} : {
    enablePan?: false;
    translateExtent?: never;
};
type ProjectionConfigConditional<T extends string> = T extends 'geoAlbers' ? ProjectionConfig & Required<Pick<ProjectionConfig, 'parallels'>> : T extends 'geoConicEqualArea' | 'geoConicConformal' ? ProjectionConfig & Required<Pick<ProjectionConfig, 'parallels'>> : ProjectionConfig;
type ProjectionName = `geo${Capitalize<string>}`;
interface ProjectionConfig {
    center?: Coordinates;
    rotate?: RotationAngles;
    scale?: number;
    parallels?: Parallels;
}
interface MapContextType {
    width: number;
    height: number;
    projection: GeoProjection;
    path: GeoPath;
}
interface ZoomPanContextType {
    x: number;
    y: number;
    k: number;
    transformString: string;
}
interface ComposableMapProps<P extends string = string, M extends boolean = false> extends SVGProps<SVGSVGElement> {
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
type GeographiesProps<E extends boolean = false> = Omit<SVGProps<SVGGElement>, 'children' | 'onError'> & GeographyPropsWithErrorHandling<E> & {
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
interface GeographyEventData {
    geography: Feature<Geometry>;
    centroid: Coordinates | null;
    bounds: [Coordinates, Coordinates] | null;
    coordinates: Coordinates | null;
}
interface GeographyProps extends Omit<SVGProps<SVGPathElement>, 'style' | 'onClick' | 'onMouseEnter' | 'onMouseLeave' | 'onMouseDown' | 'onMouseUp' | 'onFocus' | 'onBlur'> {
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
type ZoomableGroupProps<Z extends boolean = true, P extends boolean = true> = SVGProps<SVGGElement> & ZoomBehaviorProps<Z> & PanBehaviorProps<P> & {
    center?: Coordinates;
    zoom?: number;
    filterZoomEvent?: (event: Event) => boolean;
    onMoveStart?: (position: Position, event: Event) => void;
    onMove?: (position: Position, event: Event) => void;
    onMoveEnd?: (position: Position, event: Event) => void;
    className?: string;
    children?: ReactNode;
};
interface SimpleZoomableGroupProps extends SVGProps<SVGGElement> {
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
type ZoomableGroupPropsUnion = ZoomableGroupProps<true, true> | ZoomableGroupProps<true, false> | ZoomableGroupProps<false, true> | ZoomableGroupProps<false, false> | SimpleZoomableGroupProps;
interface MarkerProps extends Omit<SVGProps<SVGGElement>, 'style'> {
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
interface LineProps extends Omit<SVGProps<SVGPathElement>, 'from' | 'to'> {
    from: Coordinates;
    to: Coordinates;
    coordinates?: Coordinates[];
    className?: string;
}
interface AnnotationProps extends SVGProps<SVGGElement> {
    subject: Coordinates;
    dx?: number;
    dy?: number;
    curve?: number;
    connectorProps?: SVGProps<SVGPathElement>;
    className?: string;
    children?: ReactNode;
}
interface GraticuleProps extends SVGProps<SVGPathElement> {
    step?: GraticuleStep;
    className?: string;
}
interface SphereProps extends SVGProps<SVGPathElement> {
    id?: string;
    className?: string;
}
interface UseGeographiesProps {
    geography: string | Topology | FeatureCollection;
    parseGeographies?: (geographies: Feature<Geometry>[]) => Feature<Geometry>[];
}
interface PreparedFeature extends Feature<Geometry> {
    svgPath: string;
    rsmKey: string;
}
interface GeographyData {
    geographies: PreparedFeature[];
    outline: string;
    borders: string;
    center?: Coordinates;
}
interface ZoomPanState {
    x: number;
    y: number;
    k: number;
}
interface Position {
    coordinates: Coordinates;
    zoom: number;
}

declare function ComposableMap({ width, height, projection, projectionConfig, className, debug, children, ref, ...restProps }: Omit<ComposableMapProps, 'metadata'> & {
    ref?: Ref<SVGSVGElement>;
}): react_jsx_runtime.JSX.Element;
declare namespace ComposableMap {
    var displayName: string;
}
declare const _default$6: react.MemoExoticComponent<typeof ComposableMap>;
//# sourceMappingURL=ComposableMap.d.ts.map

/**
 * Predefined metadata configurations for common map types
 */
declare const mapMetadataPresets: {
    worldMap: {
        title: string;
        description: string;
        keywords: string[];
        author: string;
        ogTitle: string;
        ogDescription: string;
        twitterTitle: string;
        twitterDescription: string;
        jsonLd: {
            '@context': string;
            '@type': string;
            name: string;
            description: string;
            mapType: string;
        };
    };
    countryMap: (countryName: string) => {
        title: string;
        description: string;
        keywords: string[];
        author: string;
        ogTitle: string;
        ogDescription: string;
        twitterTitle: string;
        twitterDescription: string;
        jsonLd: {
            '@context': string;
            '@type': string;
            name: string;
            description: string;
            mapType: string;
            about: {
                '@type': string;
                name: string;
            };
        };
    };
    cityMap: (cityName: string, countryName?: string) => {
        title: string;
        description: string;
        keywords: string[];
        author: string;
        ogTitle: string;
        ogDescription: string;
        twitterTitle: string;
        twitterDescription: string;
        jsonLd: {
            '@context': string;
            '@type': string;
            name: string;
            description: string;
            mapType: string;
            about: {
                containedInPlace?: {
                    '@type': string;
                    name: string;
                };
                '@type': string;
                name: string;
            };
        };
    };
    dataVisualization: (dataType: string) => {
        title: string;
        description: string;
        keywords: string[];
        author: string;
        ogTitle: string;
        ogDescription: string;
        twitterTitle: string;
        twitterDescription: string;
        jsonLd: {
            '@context': string;
            '@type': string;
            name: string;
            description: string;
            distribution: {
                '@type': string;
                encodingFormat: string;
            };
        };
    };
};

interface MapWithMetadataProps extends ComposableMapProps {
    metadata: Required<NonNullable<ComposableMapProps['metadata']>>;
    enableSEO?: boolean;
    enableOpenGraph?: boolean;
    enableTwitterCards?: boolean;
    enableJsonLd?: boolean;
    preset?: keyof typeof mapMetadataPresets;
}
declare function MapWithMetadata({ metadata, enableSEO, enableOpenGraph, enableTwitterCards, enableJsonLd, preset, children, ...mapProps }: MapWithMetadataProps): react_jsx_runtime.JSX.Element;
declare namespace MapWithMetadata {
    var displayName: string;
}
declare const _default$5: react.MemoExoticComponent<typeof MapWithMetadata>;

declare function Geographies({ geography, children, parseGeographies, className, errorBoundary, onGeographyError, fallback, ref, ...restProps }: GeographiesProps & {
    ref?: Ref<SVGGElement>;
}): react_jsx_runtime.JSX.Element;
declare namespace Geographies {
    var displayName: string;
}
declare const _default$4: react.MemoExoticComponent<typeof Geographies>;
//# sourceMappingURL=Geographies.d.ts.map

declare function Geography({ geography, onClick, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, style, className, ref, ...restProps }: GeographyProps & {
    ref?: Ref<SVGPathElement>;
}): react_jsx_runtime.JSX.Element;
declare namespace Geography {
    var displayName: string;
}
declare const _default$3: react.MemoExoticComponent<typeof Geography>;
//# sourceMappingURL=Geography.d.ts.map

declare function Graticule({ fill, stroke, step, className, ref, ...restProps }: GraticuleProps & {
    ref?: Ref<SVGPathElement>;
}): react_jsx_runtime.JSX.Element;
declare namespace Graticule {
    var displayName: string;
}
declare const _default$2: react.MemoExoticComponent<typeof Graticule>;
//# sourceMappingURL=Graticule.d.ts.map

declare function ZoomableGroup(props: ZoomableGroupPropsUnion & {
    ref?: Ref<SVGGElement>;
}): react_jsx_runtime.JSX.Element;
declare namespace ZoomableGroup {
    var displayName: string;
}
//# sourceMappingURL=ZoomableGroup.d.ts.map

declare function Sphere({ id, fill, stroke, strokeWidth, className, ref, ...restProps }: SphereProps & {
    ref?: Ref<SVGPathElement>;
}): react_jsx_runtime.JSX.Element;
declare namespace Sphere {
    var displayName: string;
}
declare const _default$1: react.MemoExoticComponent<typeof Sphere>;
//# sourceMappingURL=Sphere.d.ts.map

declare function Marker({ coordinates, children, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, style, className, ref, ...restProps }: MarkerProps & {
    ref?: Ref<SVGGElement>;
}): react_jsx_runtime.JSX.Element | null;
declare namespace Marker {
    var displayName: string;
}
declare const _default: react.MemoExoticComponent<typeof Marker>;
//# sourceMappingURL=Marker.d.ts.map

declare function Line({ from, to, coordinates, stroke, strokeWidth, fill, className, ref, ...restProps }: LineProps & {
    ref?: Ref<SVGPathElement>;
}): react_jsx_runtime.JSX.Element;
declare namespace Line {
    var displayName: string;
}
//# sourceMappingURL=Line.d.ts.map

declare function Annotation({ subject, children, connectorProps, dx, dy, curve, className, ref, ...restProps }: AnnotationProps & {
    ref?: Ref<SVGGElement>;
}): react_jsx_runtime.JSX.Element | null;
declare namespace Annotation {
    var displayName: string;
}
//# sourceMappingURL=Annotation.d.ts.map

declare const MapContext: react__default.Context<MapContextType | undefined>;
interface MapProviderProps {
    width: number;
    height: number;
    projection?: string | GeoProjection;
    projectionConfig?: ProjectionConfig;
    children: ReactNode;
}
declare const MapProvider: react__default.FC<MapProviderProps>;
declare const useMapContext: () => MapContextType;
//# sourceMappingURL=MapProvider.d.ts.map

declare const ZoomPanContext: react__default.Context<ZoomPanContextType | undefined>;
interface ZoomPanProviderProps {
    value?: ZoomPanContextType;
    children: ReactNode;
}
declare const ZoomPanProvider: react__default.FC<ZoomPanProviderProps>;
declare const useZoomPanContext: () => ZoomPanContextType;
//# sourceMappingURL=ZoomPanProvider.d.ts.map

declare function useGeographies({ geography, parseGeographies, }: UseGeographiesProps): GeographyData;

interface UseZoomPanHookProps {
    center: Coordinates;
    filterZoomEvent?: (event: Event) => boolean;
    onMoveStart?: (position: Position, event: Event) => void;
    onMoveEnd?: (position: Position, event: Event) => void;
    onMove?: (position: Position, event: Event) => void;
    translateExtent?: TranslateExtent;
    scaleExtent?: ScaleExtent;
    zoom?: number;
}
interface UseZoomPanReturn {
    mapRef: React.RefObject<SVGGElement | null>;
    position: {
        x: number;
        y: number;
        k: number;
        dragging?: Event | undefined;
    };
    transformString: string;
    isPending: boolean;
}
declare function useZoomPan({ center, filterZoomEvent, onMoveStart, onMoveEnd, onMove, translateExtent, scaleExtent, zoom, }: UseZoomPanHookProps): UseZoomPanReturn;

interface GeographyErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, retry: () => void) => ReactNode;
    onError?: (error: Error) => void;
}
declare function GeographyErrorBoundary({ children, fallback, onError, }: GeographyErrorBoundaryProps): react_jsx_runtime.JSX.Element;

/**
 * Calculates the centroid (center point) of a geographic feature
 * @param geography - GeoJSON feature
 * @returns Centroid coordinates or null if calculation fails
 */
declare function getGeographyCentroid(geography: Feature<Geometry>): Coordinates | null;
/**
 * Calculates the bounding box of a geographic feature
 * @param geography - GeoJSON feature
 * @returns Bounding box as [southwest, northeast] coordinates or null if calculation fails
 */
declare function getGeographyBounds(geography: Feature<Geometry>): [Coordinates, Coordinates] | null;
/**
 * Extracts coordinates from different geometry types
 * @param geography - GeoJSON feature
 * @returns First available coordinate or null
 */
declare function getGeographyCoordinates(geography: Feature<Geometry>): Coordinates | null;
/**
 * Gets the best available coordinate representation for a geography
 * Tries centroid first, falls back to first coordinate
 * @param geography - GeoJSON feature
 * @returns Best available coordinates or null
 */
declare function getBestGeographyCoordinates(geography: Feature<Geometry>): Coordinates | null;
/**
 * Type guard to check if coordinates are valid
 * @param coords - Coordinates to validate
 * @returns True if coordinates are valid
 */
declare function isValidCoordinates(coords: unknown): coords is Coordinates;

export { Annotation, _default$6 as ComposableMap, _default$4 as Geographies, _default$3 as Geography, GeographyErrorBoundary, _default$2 as Graticule, Line, MapContext, MapProvider, _default$5 as MapWithMetadata, _default as Marker, _default$1 as Sphere, ZoomPanContext, ZoomPanProvider, ZoomableGroup, createCoordinates, createGraticuleStep, createLatitude, createLongitude, createPanConfig, createParallels, createScaleExtent, createTranslateExtent, createZoomConfig, createZoomPanConfig, getBestGeographyCoordinates, getGeographyBounds, getGeographyCentroid, getGeographyCoordinates, isValidCoordinates, useGeographies, useMapContext, useZoomPan, useZoomPanContext };
export type { AnnotationProps, ComposableMapProps, Coordinates, GeographiesProps, GeographyData, GeographyEventData, GeographyProps, GraticuleProps, Latitude, LineProps, Longitude, MapContextType, MapWithMetadataProps, MarkerProps, Position, PreparedFeature, ProjectionConfig, SimpleZoomableGroupProps, SphereProps, UseGeographiesProps, ZoomPanContextType, ZoomPanState, ZoomableGroupProps, ZoomableGroupPropsUnion };
