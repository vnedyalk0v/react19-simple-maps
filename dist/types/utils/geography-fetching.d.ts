import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
/**
 * Basic fetch function for geography data without caching
 * @param url - The URL to fetch geography data from
 * @returns Promise resolving to geography data or undefined on error
 */
export declare function fetchGeographies(url: string): Promise<Topology | FeatureCollection | undefined>;
/**
 * Secure, cached geography fetching with comprehensive validation
 * This function is cached using React's cache() for optimal performance
 */
export declare const fetchGeographiesCache: (url: string) => Promise<Topology | FeatureCollection>;
/**
 * Preloads geography data for better performance
 * @param url - The URL to preload
 */
export declare function preloadGeography(url: string): void;
//# sourceMappingURL=geography-fetching.d.ts.map