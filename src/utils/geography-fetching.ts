import { cache } from 'react';
import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
import { GeographyError } from '../types';
import {
  validateGeographyUrl,
  validateContentType,
  validateResponseSize,
  readResponseWithSizeLimit,
  validateGeographyData,
  GEOGRAPHY_FETCH_CONFIG,
} from './geography-validation';
import { createGeographyFetchError } from './error-utils';
import {
  getSRIForUrl,
  validateSRIFromArrayBuffer,
} from './subresource-integrity';

/** Maximum number of redirect hops allowed */
const MAX_REDIRECTS = 5;

/**
 * Creates fetch options with security headers and timeout.
 * Uses `redirect: 'manual'` so each redirect hop can be validated against the URL policy.
 * @param signal - AbortController signal for timeout
 * @returns Fetch options object
 */
function createSecureFetchOptions(signal: AbortSignal): RequestInit {
  return {
    signal,
    headers: {
      Accept: GEOGRAPHY_FETCH_CONFIG.ALLOWED_CONTENT_TYPES.join(', '),
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
    // Security headers
    mode: 'cors',
    credentials: 'omit', // Don't send credentials
    redirect: 'manual', // Handle redirects manually to validate each hop
  };
}

/**
 * Follows redirects manually, validating each hop against the URL security policy.
 * Prevents redirect-based SSRF bypasses.
 * @param url - The initial URL to fetch
 * @param options - Fetch options (must have redirect: 'manual')
 * @returns The final non-redirect response
 */
async function fetchWithRedirectValidation(
  url: string,
  options: RequestInit,
): Promise<Response> {
  let currentUrl = url;

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const response = await fetch(currentUrl, options);

    // Not a redirect — return directly
    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    // Consume the redirect response body to release connection resources
    try {
      await response.arrayBuffer();
    } catch {
      // Ignore body-consumption errors — they must not mask redirect handling
    }

    // Extract and validate the redirect target
    const location = response.headers.get('location');
    if (!location) {
      throw createGeographyFetchError(
        'SECURITY_ERROR',
        `Redirect response (HTTP ${response.status}) missing Location header`,
        currentUrl,
      );
    }

    // Resolve relative redirects against current URL
    const redirectUrl = new URL(location, currentUrl).href;

    // Validate the redirect target against the same URL security policy
    validateGeographyUrl(redirectUrl);

    currentUrl = redirectUrl;
  }

  throw createGeographyFetchError(
    'SECURITY_ERROR',
    `Too many redirects (exceeded ${MAX_REDIRECTS} hops)`,
    url,
  );
}

/**
 * Creates an abort controller with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @returns Object with controller and cleanup function
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * Handles fetch errors and converts them to geography-specific errors
 * @param error - The original error
 * @param url - The URL that was being fetched
 * @returns A GeographyError
 */
function handleFetchError(error: unknown, url: string): GeographyError {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createGeographyFetchError(
        'GEOGRAPHY_LOAD_ERROR',
        `Request timeout after ${GEOGRAPHY_FETCH_CONFIG.TIMEOUT_MS}ms`,
        url,
        error,
      );
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return createGeographyFetchError(
        'GEOGRAPHY_LOAD_ERROR',
        `Network error: Unable to fetch geography from ${url}`,
        url,
        error,
      );
    }
    if (error.message.includes('Invalid geography data')) {
      return createGeographyFetchError(
        'GEOGRAPHY_PARSE_ERROR',
        error.message,
        url,
        error,
      );
    }
  }

  // Re-throw if it's already a GeographyError
  if (error instanceof Error && 'type' in error) {
    return error as GeographyError;
  }

  // Default error
  return createGeographyFetchError(
    'GEOGRAPHY_LOAD_ERROR',
    error instanceof Error ? error.message : 'Unknown error occurred',
    url,
    error instanceof Error ? error : undefined,
  );
}

/**
 * Parses JSON from ArrayBuffer with proper error handling
 * @param arrayBuffer - The response data as ArrayBuffer
 * @param url - The URL for error context
 * @returns Parsed geography data
 */
async function parseGeographyFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  url: string,
): Promise<Topology | FeatureCollection> {
  try {
    const text = new TextDecoder().decode(arrayBuffer);
    const data = JSON.parse(text);
    validateGeographyData(data);
    return data as Topology | FeatureCollection;
  } catch (jsonError) {
    if (jsonError instanceof SyntaxError) {
      throw createGeographyFetchError(
        'GEOGRAPHY_PARSE_ERROR',
        'Invalid JSON format in geography data',
        url,
        jsonError,
      );
    }
    throw jsonError;
  }
}

/**
 * Fetch geography data with full security validation.
 *
 * @deprecated Since v2.1.0 — use {@link fetchGeographiesCache} instead for
 * cached, secure fetching. This function now delegates to the hardened pipeline
 * but swallows errors for backward compatibility.
 *
 * @param url - The URL to fetch geography data from
 * @returns Promise resolving to geography data or undefined on error
 */
export async function fetchGeographies(
  url: string,
): Promise<Topology | FeatureCollection | undefined> {
  if (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      'fetchGeographies is deprecated. Use fetchGeographiesCache for secure, cached fetching.',
    );
  }
  try {
    return await fetchGeographiesCache(url);
  } catch {
    return undefined;
  }
}

/**
 * Secure, cached geography fetching with comprehensive validation
 * This function is cached using React's cache() for optimal performance
 */
export const fetchGeographiesCache = cache(
  async (url: string): Promise<Topology | FeatureCollection> => {
    // Validate URL before making request
    validateGeographyUrl(url);

    // Check if SRI validation is required
    const sriConfig = getSRIForUrl(url);

    // Create timeout controller
    const { controller, cleanup } = createTimeoutController(
      GEOGRAPHY_FETCH_CONFIG.TIMEOUT_MS,
    );

    try {
      // Make secure fetch request with redirect validation
      const response = await fetchWithRedirectValidation(
        url,
        createSecureFetchOptions(controller.signal),
      );
      cleanup();

      // Validate response
      if (!response.ok) {
        throw createGeographyFetchError(
          'GEOGRAPHY_LOAD_ERROR',
          `HTTP ${response.status}: ${response.statusText}`,
          url,
        );
      }

      // Validate content type and fast pre-check of Content-Length
      validateContentType(response);
      await validateResponseSize(response);

      // Read body with hard streaming size limit (guards against falsified Content-Length)
      const arrayBuffer = await readResponseWithSizeLimit(response);

      // Handle SRI validation if required
      if (sriConfig) {
        await validateSRIFromArrayBuffer(arrayBuffer, url, sriConfig);
      }

      // Parse JSON from the already-read ArrayBuffer
      return await parseGeographyFromArrayBuffer(arrayBuffer, url);
    } catch (error) {
      cleanup();
      throw handleFetchError(error, url);
    }
  },
);

/**
 * Preloads geography data for better performance
 * @param url - The URL to preload
 */
export function preloadGeography(url: string): void {
  // Import and use the preload utility with immediate flag
  import('./preloading')
    .then(({ preloadGeography: preloadUtil }) => {
      preloadUtil(url, true); // immediate = true
    })
    .catch(() => {
      // Silently handle import errors
    });

  // Also preload the actual data
  fetchGeographiesCache(url).catch(() => {
    // Silently ignore preload errors
  });
}
