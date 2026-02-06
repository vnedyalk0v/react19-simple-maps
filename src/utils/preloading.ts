import { preload, prefetchDNS, preconnect, preinit } from 'react-dom';
import { validateGeographyUrl } from './geography-validation';

// React 19 resource preloading utilities for geography data

// Track preloaded URLs to avoid duplicate preloads
const preloadedUrls = new Set<string>();

/**
 * Preload geography resources for better performance.
 * Runs the same URL security validation used by the fetch pipeline before
 * issuing any network activity (DNS prefetch, preconnect, preload).
 */
export function preloadGeography(url: string, immediate = false): void {
  if (typeof url !== 'string' || !url) {
    return;
  }

  // Avoid duplicate preloads
  if (preloadedUrls.has(url)) {
    return;
  }

  try {
    // Validate the URL against the security policy *before* any network activity
    validateGeographyUrl(url);

    const parsedUrl = new URL(url);

    // Always prefetch DNS and preconnect (lightweight operations)
    prefetchDNS(parsedUrl.origin);
    preconnect(parsedUrl.origin);

    // Only preload the actual resource if immediate or in production
    const shouldPreloadResource =
      immediate ||
      (typeof process !== 'undefined' && process.env.NODE_ENV === 'production');

    if (shouldPreloadResource) {
      preload(url, {
        as: 'fetch',
        crossOrigin: 'anonymous', // Most geography APIs support CORS
      });
      preloadedUrls.add(url);
    }
  } catch (error) {
    // Silently handle invalid/disallowed URLs in development only
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      // eslint-disable-next-line no-console
      console.warn('Failed to preload geography resource:', error);
    }
  }
}

/**
 * Preload multiple geography resources
 */
export function preloadGeographies(urls: string[]): void {
  urls.forEach((url) => preloadGeography(url));
}

/**
 * Preload common geography data sources
 */
export function preloadCommonGeographySources(): void {
  const commonSources = [
    'https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json',
    'https://raw.githubusercontent.com/deldersveld/topojson/master/world-50m.json',
    'https://raw.githubusercontent.com/deldersveld/topojson/master/world-110m.json',
  ];

  // Prefetch DNS for common geography data sources
  prefetchDNS('https://raw.githubusercontent.com');
  preconnect('https://raw.githubusercontent.com');

  // Preload common geography files
  commonSources.forEach((url) => {
    preload(url, {
      as: 'fetch',
      crossOrigin: 'anonymous',
    });
  });
}

/**
 * Initialize critical geography resources for the application
 */
export function initializeGeographyResources(
  options: {
    primaryGeography?: string;
    fallbackGeographies?: string[];
    preloadCommon?: boolean;
  } = {},
): void {
  const {
    primaryGeography,
    fallbackGeographies = [],
    preloadCommon = false,
  } = options;

  // Preload primary geography resource with high priority
  if (primaryGeography) {
    preloadGeography(primaryGeography);
  }

  // Preload fallback geographies with lower priority
  if (fallbackGeographies.length > 0) {
    // Use setTimeout to defer fallback preloading
    setTimeout(() => {
      preloadGeographies(fallbackGeographies);
    }, 100);
  }

  // Preload common sources if requested
  if (preloadCommon) {
    setTimeout(() => {
      preloadCommonGeographySources();
    }, 200);
  }
}

/**
 * Preload geography-related scripts and stylesheets
 */
export function preloadGeographyAssets(
  options: {
    d3Scripts?: string[];
    stylesheets?: string[];
  } = {},
): void {
  const { d3Scripts = [], stylesheets = [] } = options;

  // Preload D3.js scripts if needed
  d3Scripts.forEach((scriptUrl) => {
    preinit(scriptUrl, { as: 'script' });
  });

  // Preload stylesheets
  stylesheets.forEach((stylesheetUrl) => {
    preload(stylesheetUrl, { as: 'style' });
  });
}

/**
 * Smart preloading based on user interaction patterns
 */
export class GeographyPreloader {
  private preloadedUrls = new Set<string>();
  private preloadQueue: string[] = [];
  private isProcessing = false;

  /**
   * Add a geography URL to the preload queue
   */
  queue(url: string): void {
    if (!this.preloadedUrls.has(url) && !this.preloadQueue.includes(url)) {
      this.preloadQueue.push(url);
      this.processQueue();
    }
  }

  /**
   * Immediately preload a geography URL
   */
  immediate(url: string): void {
    if (!this.preloadedUrls.has(url)) {
      preloadGeography(url);
      this.preloadedUrls.add(url);
    }
  }

  /**
   * Process the preload queue with throttling
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const url = this.preloadQueue.shift();
      if (url && !this.preloadedUrls.has(url)) {
        preloadGeography(url);
        this.preloadedUrls.add(url);

        // Throttle preloading to avoid overwhelming the network
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Clear the preload queue and cache
   */
  clear(): void {
    this.preloadQueue.length = 0;
    this.preloadedUrls.clear();
    this.isProcessing = false;
  }

  /**
   * Get preloading statistics
   */
  getStats(): { preloaded: number; queued: number } {
    return {
      preloaded: this.preloadedUrls.size,
      queued: this.preloadQueue.length,
    };
  }
}

// Global preloader instance
export const globalGeographyPreloader = new GeographyPreloader();

/**
 * Hook-like function for component-level preloading
 */
export function useGeographyPreloading(urls: string | string[]): void {
  const urlArray = Array.isArray(urls) ? urls : [urls];

  urlArray.forEach((url) => {
    if (url) {
      globalGeographyPreloader.queue(url);
    }
  });
}
