/**
 * Preload geography resources for better performance
 * Only preloads if the resource will be used soon
 */
export declare function preloadGeography(url: string, immediate?: boolean): void;
/**
 * Preload multiple geography resources
 */
export declare function preloadGeographies(urls: string[]): void;
/**
 * Preload common geography data sources
 */
export declare function preloadCommonGeographySources(): void;
/**
 * Initialize critical geography resources for the application
 */
export declare function initializeGeographyResources(options?: {
    primaryGeography?: string;
    fallbackGeographies?: string[];
    preloadCommon?: boolean;
}): void;
/**
 * Preload geography-related scripts and stylesheets
 */
export declare function preloadGeographyAssets(options?: {
    d3Scripts?: string[];
    stylesheets?: string[];
}): void;
/**
 * Smart preloading based on user interaction patterns
 */
export declare class GeographyPreloader {
    private preloadedUrls;
    private preloadQueue;
    private isProcessing;
    /**
     * Add a geography URL to the preload queue
     */
    queue(url: string): void;
    /**
     * Immediately preload a geography URL
     */
    immediate(url: string): void;
    /**
     * Process the preload queue with throttling
     */
    private processQueue;
    /**
     * Clear the preload queue and cache
     */
    clear(): void;
    /**
     * Get preloading statistics
     */
    getStats(): {
        preloaded: number;
        queued: number;
    };
}
export declare const globalGeographyPreloader: GeographyPreloader;
/**
 * Hook-like function for component-level preloading
 */
export declare function useGeographyPreloading(urls: string | string[]): void;
//# sourceMappingURL=preloading.d.ts.map