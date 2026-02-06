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
 * Create fetch options with security-conscious defaults.
 *
 * The options limit accepted content types, set caching to one hour, enforce CORS mode,
 * omit credentials, and use `redirect: 'manual'` so callers can validate each redirect hop.
 *
 * @param signal - AbortSignal used to cancel the request (e.g., on timeout)
 * @returns The configured `RequestInit` options for secure fetching
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
 * Follow redirects manually and validate each hop against the URL security policy.
 *
 * @param options - Fetch options; must include `redirect: 'manual'` so redirects are handled by this function
 * @returns The final non-redirect `Response`
 * @throws createGeographyFetchError with type `SECURITY_ERROR` if a redirect response is missing a `Location` header or if the maximum redirect hops (MAX_REDIRECTS) is exceeded
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
 * Convert a fetch-related error into a GeographyError with a suitable type and message.
 *
 * Maps specific error cases to geography error types:
 * - An `AbortError` becomes a `GEOGRAPHY_LOAD_ERROR` indicating a timeout.
 * - A `TypeError` whose message contains `"fetch"` becomes a `GEOGRAPHY_LOAD_ERROR` indicating a network failure.
 * - An error whose message contains `"Invalid geography data"` becomes a `GEOGRAPHY_PARSE_ERROR`.
 * If the provided error already contains a `type` property, it is returned as-is. All other errors become `GEOGRAPHY_LOAD_ERROR` with the original message or `"Unknown error occurred"`.
 *
 * @param error - The original error thrown during fetch or parsing
 * @param url - The URL that was being fetched; included in the created GeographyError context
 * @returns A GeographyError representing the mapped error type and message
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
 * Decode JSON from an ArrayBuffer and validate it as geography data.
 *
 * @param url - The resource URL used to provide context in errors
 * @returns A `Topology` or `FeatureCollection` parsed from the buffer
 * @throws GEOGRAPHY_PARSE_ERROR when the buffer does not contain valid JSON
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
 * Fetch geography data using the secure, cached pipeline but return undefined on error for backward compatibility.
 *
 * @deprecated Since v2.1.0 — use {@link fetchGeographiesCache} for cached, secure fetching; this function delegates to that pipeline and swallows errors.
 * @param url - The URL to fetch geography data from
 * @returns Geography `Topology` or `FeatureCollection`, or `undefined` if an error occurred
 */
export async function fetchGeographies(
  url: string,
): Promise<Topology | FeatureCollection | undefined> {
  if (
    typeof process !== 'undefined' &&
    process?.env?.NODE_ENV !== 'production'
  ) {
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