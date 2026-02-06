import { preload, prefetchDNS, preconnect, preinit } from 'react-dom';
import { validateGeographyUrl } from './geography-validation';

// React 19 resource preloading utilities for geography data

/**
 * Validate a URL intended for resource preloading (scripts, stylesheets, etc.).
 *
 * Reuses the same security policy as geography fetching (HTTPS-only, no private
 * IPs) so that `preinit` / `preload` never fires for disallowed origins.
 *
 * @param url - The URL to validate
 * @returns `true` when the URL passes validation; `false` otherwise (a
 *   development-mode warning is logged for rejected URLs).
 */
export function validatePreloadUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) {
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        'Preload URL validation failed: URL must be a non-empty string',
      );
    }
    return false;
  }

  try {
    // Delegate to the same validator used by the fetch pipeline.
    // This enforces HTTPS-only, blocks private IPs, and rejects
    // malformed URLs — keeping the security boundary consistent.
    validateGeographyUrl(url);
    return true;
  } catch (error: unknown) {
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      const message =
        error instanceof Error ? error.message : 'Unknown validation error';
      // eslint-disable-next-line no-console
      console.warn(`Preload URL rejected (${url}): ${message}`);
    }
    return false;
  }
}

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
  } catch (error: unknown) {
    // Silently handle invalid/disallowed URLs in development only
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(`Failed to preload geography resource: ${message}`);
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

  // Delegate to preloadGeography so every URL goes through validation,
  // deduplication, and the standard prefetchDNS/preconnect/preload pipeline.
  commonSources.forEach((url) => {
    preloadGeography(url, true);
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
 * Preload geography-related scripts and stylesheets.
 *
 * Every URL is validated through {@link validatePreloadUrl} (HTTPS-only,
 * private-IP blocking) before any network activity is initiated.  URLs that
 * fail validation are silently skipped with a development-mode console warning.
 */
export function preloadGeographyAssets(
  options: {
    d3Scripts?: string[];
    stylesheets?: string[];
  } = {},
): void {
  const { d3Scripts = [], stylesheets = [] } = options;

  // Preload D3.js scripts if needed — validate each URL first
  d3Scripts.forEach((scriptUrl) => {
    if (!validatePreloadUrl(scriptUrl)) {
      return; // skip invalid / disallowed URLs
    }
    preinit(scriptUrl, { as: 'script' });
  });

  // Preload stylesheets — validate each URL first
  stylesheets.forEach((stylesheetUrl) => {
    if (!validatePreloadUrl(stylesheetUrl)) {
      return; // skip invalid / disallowed URLs
    }
    preload(stylesheetUrl, { as: 'style' });
  });
}

/**
 * Smart preloading based on user interaction patterns.
 *
 * **Deduplication model – two levels:**
 *
 * 1. *Instance-level* – `preloadedUrls` (a private `Set<string>` on each
 *    `GeographyPreloader` instance) records every URL that has been requested
 *    through **this particular instance** via {@link queue} or
 *    {@link immediate}.  It is used to skip duplicate requests within the
 *    instance and to power {@link getStats}.
 *
 * 2. *Module-level (global)* – the module-scoped `preloadedUrls` set inside
 *    {@link preloadGeography} performs the **actual** network-level
 *    deduplication.  Because both {@link queue} and {@link immediate} delegate
 *    to `preloadGeography`, a URL that was already preloaded by *any* caller
 *    (another `GeographyPreloader` instance, a direct `preloadGeography`
 *    call, etc.) will be silently skipped at the network layer even if this
 *    instance has never seen it.
 *
 * As a consequence, {@link getStats} only reflects URLs requested through
 * **this** instance — URLs preloaded elsewhere in the application will not
 * appear in the count.  If global tracking is desired, synchronising the two
 * sets (e.g. by exposing the module-level set or maintaining a shared
 * registry) is possible but optional, since `preloadGeography` already
 * prevents redundant network requests regardless.
 */
export class GeographyPreloader {
  private preloadedUrls = new Set<string>();
  private pendingUrls = new Set<string>();
  private preloadQueue: string[] = [];
  private isProcessing = false;

  /**
   * Add a geography URL to the preload queue.
   *
   * The URL is recorded in the instance-level `preloadedUrls` set once it is
   * actually processed by {@link processQueue}.  The underlying call to
   * {@link preloadGeography} applies global (module-level) deduplication, so
   * the network request will be skipped if the URL was already preloaded
   * elsewhere.
   */
  queue(url: string): void {
    if (!this.preloadedUrls.has(url) && !this.pendingUrls.has(url)) {
      this.preloadQueue.push(url);
      this.pendingUrls.add(url);
      this.processQueue();
    }
  }

  /**
   * Immediately preload a geography URL.
   *
   * The URL is added to the instance-level `preloadedUrls` set for local
   * tracking.  Actual network deduplication is handled by the module-level
   * `preloadGeography` function, which maintains its own global set — a URL
   * already preloaded outside this instance will not trigger a second network
   * request but will still appear in this instance's {@link getStats}.
   */
  immediate(url: string): void {
    if (!this.preloadedUrls.has(url)) {
      preloadGeography(url);
      this.preloadedUrls.add(url);
    }
  }

  /**
   * Process the preload queue with throttling.
   *
   * Each URL is forwarded to {@link preloadGeography} (module-level global
   * dedupe) and recorded in the instance-level `preloadedUrls` set.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const url = this.preloadQueue.shift();
      if (url) {
        this.pendingUrls.delete(url);

        if (!this.preloadedUrls.has(url)) {
          preloadGeography(url);
          this.preloadedUrls.add(url);

          // Throttle preloading to avoid overwhelming the network
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Clear the preload queue and instance-level tracking set.
   *
   * Note: this does **not** clear the module-level deduplication set used by
   * {@link preloadGeography}, so re-queuing the same URLs after `clear()`
   * will still be no-ops at the network layer.
   */
  clear(): void {
    this.preloadQueue.length = 0;
    this.pendingUrls.clear();
    this.preloadedUrls.clear();
    this.isProcessing = false;
  }

  /**
   * Get preloading statistics **for this instance only**.
   *
   * `preloaded` reflects the number of unique URLs requested through this
   * `GeographyPreloader` instance (via {@link queue} or {@link immediate}).
   * URLs preloaded by other instances or by direct calls to
   * {@link preloadGeography} are **not** included.
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
 * Queue one or more geography URLs for preloading via the global preloader.
 *
 * NOTE: This is a plain helper function, **not** a React hook — it may be
 * called from any context (event handlers, effects, module scope, etc.).
 */
export function queueGeographyPreloading(urls: string | string[]): void {
  const urlArray = Array.isArray(urls) ? urls : [urls];

  urlArray.forEach((url) => {
    if (url) {
      globalGeographyPreloader.queue(url);
    }
  });
}
