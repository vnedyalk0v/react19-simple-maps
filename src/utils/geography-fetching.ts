import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
import { GeographyError } from '../types';
import {
  validateGeographyUrl,
  validateResolvedGeographyUrl,
  validateContentType,
  validateResponseSize,
  readResponseWithSizeLimit,
  validateGeographyData,
  getGeographySecurityConfig,
  type GeographySecurityConfig,
} from './geography-validation';
import { createGeographyFetchError, isGeographyError } from './error-utils';
import { preloadGeography as preloadGeographyHints } from './preloading';
import {
  getSRIForUrl,
  getSRIConfig,
  validateSRIFromArrayBuffer,
} from './subresource-integrity';

import {
  createSecureFetchOptions,
  fetchWithRedirectValidation,
  createTimeoutController,
} from './geography-transport';

/**
 * Handles fetch errors and converts them to geography-specific errors
 * @param error - The original error
 * @param url - The URL that was being fetched
 * @returns A GeographyError
 */
function handleFetchError(
  error: unknown,
  url: string,
  config: GeographySecurityConfig,
): GeographyError {
  if (isGeographyError(error)) {
    error.geography ??= url;
    return error;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createGeographyFetchError(
        'GEOGRAPHY_LOAD_ERROR',
        `Request timeout after ${config.TIMEOUT_MS}ms`,
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
  } catch (error) {
    if (
      typeof process !== 'undefined' &&
      process?.env?.NODE_ENV !== 'production'
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        'fetchGeographies failed and returned undefined for backward compatibility.',
        error,
      );
    }
    return undefined;
  }
}

async function fetchGeographyData(
  url: string,
): Promise<Topology | FeatureCollection> {
  const securityConfig = getGeographySecurityConfig();
  const sriEnforcementConfig = getSRIConfig();

  // Validate URL before making request
  validateGeographyUrl(url, securityConfig);

  // Check if SRI validation is required
  const sriConfig = getSRIForUrl(url, sriEnforcementConfig);

  // Create timeout controller before DNS validation so the timeout covers it
  const { controller, cleanup } = createTimeoutController(
    securityConfig.TIMEOUT_MS,
  );

  try {
    await Promise.race([
      validateResolvedGeographyUrl(url, securityConfig),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      }),
    ]);

    // Make secure fetch request with redirect validation
    const response = await fetchWithRedirectValidation(
      url,
      createSecureFetchOptions(controller.signal, securityConfig),
      securityConfig,
    );

    try {
      // Validate response
      if (!response.ok) {
        throw createGeographyFetchError(
          'GEOGRAPHY_LOAD_ERROR',
          `HTTP ${response.status}: ${response.statusText}`,
          url,
        );
      }

      // Validate content type and fast pre-check of Content-Length
      validateContentType(response, securityConfig);
      await validateResponseSize(response, securityConfig);
    } catch (error) {
      // Release the connection held by the unread body
      await response.body?.cancel().catch(() => {});
      throw error;
    }

    // Read body with hard streaming size limit (guards against falsified Content-Length)
    const arrayBuffer = await readResponseWithSizeLimit(
      response,
      securityConfig.MAX_RESPONSE_SIZE,
    );

    // Handle SRI validation if required
    if (sriConfig) {
      await validateSRIFromArrayBuffer(arrayBuffer, url, sriConfig);
    }

    // Parse JSON from the already-read ArrayBuffer
    return await parseGeographyFromArrayBuffer(arrayBuffer, url);
  } catch (error) {
    throw handleFetchError(error, url, securityConfig);
  } finally {
    cleanup();
  }
}

// ponytail: unbounded per-URL cache; switch to an LRU if apps load many distinct URLs.
const geographyRequests = new Map<
  string,
  Promise<Topology | FeatureCollection>
>();

/**
 * Secure, cached geography fetching with comprehensive validation.
 * In-flight and successful requests are shared per URL; failed requests are
 * evicted so later calls retry.
 */
export function fetchGeographiesCache(
  url: string,
): Promise<Topology | FeatureCollection> {
  let request = geographyRequests.get(url);
  if (!request) {
    const pending = fetchGeographyData(url);
    pending.catch(() => {
      if (geographyRequests.get(url) === pending) {
        geographyRequests.delete(url);
      }
    });
    geographyRequests.set(url, pending);
    request = pending;
  }
  return request;
}

/** @internal Test helper; not part of the public API. */
export function clearGeographyFetchCache(): void {
  geographyRequests.clear();
}

/**
 * Preloads geography data for better performance
 * @param url - The URL to preload
 */
export function preloadGeography(url: string): void {
  preloadGeographyHints(url, true); // immediate = true

  // Also preload the actual data
  fetchGeographiesCache(url).catch(() => {
    // Silently ignore preload errors
  });
}
