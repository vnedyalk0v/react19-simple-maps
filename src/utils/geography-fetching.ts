import { FeatureCollection, Geometry } from 'geojson';
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
  type SRIEnforcementConfig,
} from './subresource-integrity';

import {
  createSecureFetchOptions,
  fetchWithRedirectValidation,
  createTimeoutController,
  rejectOnAbort,
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
): Promise<Topology | FeatureCollection<Geometry | null>> {
  try {
    const text = new TextDecoder().decode(arrayBuffer);
    const data = JSON.parse(text);
    validateGeographyData(data);
    return data as Topology | FeatureCollection<Geometry | null>;
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
): Promise<Topology | FeatureCollection<Geometry | null> | undefined> {
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
  securityConfig: GeographySecurityConfig,
  sriEnforcementConfig: SRIEnforcementConfig,
): Promise<Topology | FeatureCollection<Geometry | null>> {
  // Validate URL before making request
  validateGeographyUrl(url, securityConfig);

  // Check if SRI validation is required
  const sriConfig = getSRIForUrl(url, sriEnforcementConfig);

  // Create timeout controller before DNS validation so the timeout covers it
  const { controller, cleanup } = createTimeoutController(
    securityConfig.TIMEOUT_MS,
  );

  try {
    await rejectOnAbort(
      validateResolvedGeographyUrl(url, securityConfig),
      controller.signal,
    );

    // Make secure fetch request with redirect validation
    const { response, urls } = await fetchWithRedirectValidation(
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

    // Keep the original URL's policy, including custom integrity in strict mode.
    if (sriConfig) {
      await validateSRIFromArrayBuffer(arrayBuffer, url, sriConfig);
    }

    // Redirects must retain any source-specific hashes at every hop. The
    // original policy already checks whether a hash is required, so an alias
    // with a pinned hash can still redirect to a target without its own hash.
    const redirectSRIConfig = {
      ...sriEnforcementConfig,
      enforceForAllSources: false,
    };
    for (const redirectUrl of urls.slice(1)) {
      const redirectSRI = getSRIForUrl(redirectUrl, redirectSRIConfig);
      if (redirectSRI) {
        await validateSRIFromArrayBuffer(arrayBuffer, redirectUrl, redirectSRI);
      }
    }

    // Parse JSON from the already-read ArrayBuffer
    return await parseGeographyFromArrayBuffer(arrayBuffer, url);
  } catch (error) {
    throw handleFetchError(error, url, securityConfig);
  } finally {
    cleanup();
  }
}

interface InFlightGeographyRequest {
  promise: Promise<Topology | FeatureCollection<Geometry | null>>;
  securityConfig: GeographySecurityConfig;
  sriConfig: SRIEnforcementConfig;
}

const inFlightRequests = new Map<string, InFlightGeographyRequest>();

/**
 * Secure geography fetching with comprehensive validation.
 * Concurrent calls for the same URL share one in-flight request while the
 * security and SRI configuration are unchanged. Nothing is cached once a
 * request settles, so later calls fetch again under the current configuration.
 */
export function fetchGeographiesCache(
  url: string,
): Promise<Topology | FeatureCollection<Geometry | null>> {
  const securityConfig = getGeographySecurityConfig();
  const sriConfig = getSRIConfig();
  const inFlight = inFlightRequests.get(url);
  if (
    inFlight?.securityConfig === securityConfig &&
    inFlight.sriConfig === sriConfig
  ) {
    return inFlight.promise;
  }

  const request: InFlightGeographyRequest = {
    promise: fetchGeographyData(url, securityConfig, sriConfig),
    securityConfig,
    sriConfig,
  };
  const evict = () => {
    if (inFlightRequests.get(url) === request) inFlightRequests.delete(url);
  };
  request.promise.then(evict, evict);
  inFlightRequests.set(url, request);
  return request.promise;
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
