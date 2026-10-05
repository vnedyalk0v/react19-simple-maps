import { createGeographyFetchError } from './error-utils';
import {
  validateGeographyUrl,
  validateResolvedGeographyUrl,
  type GeographySecurityConfig,
} from './geography-validation';

/** Maximum number of redirect hops allowed */
const MAX_REDIRECTS = 5;

/**
 * Creates fetch options with security headers and timeout.
 * Uses `redirect: 'manual'` so each redirect hop can be validated against the URL policy.
 * @param signal - AbortController signal for timeout
 * @returns Fetch options object
 */
export function createSecureFetchOptions(
  signal: AbortSignal,
  config: GeographySecurityConfig,
): RequestInit {
  return {
    signal,
    headers: {
      Accept: config.ALLOWED_CONTENT_TYPES.join(', '),
    },
    // Security headers
    mode: 'cors',
    credentials: 'omit', // Don't send credentials
    redirect: 'manual', // Handle redirects manually to validate each hop
  };
}

/**
 * Rejects with an `AbortError` once `signal` aborts, so awaited work that does
 * not accept a signal (such as DNS validation) still honours the timeout.
 */
export function rejectOnAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal | null | undefined,
): Promise<T> {
  if (!signal) return promise;
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      reject(abortError);
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  return Promise.race([promise, aborted]).finally(() =>
    signal.removeEventListener('abort', onAbort),
  );
}

/**
 * Follows redirects manually, validating each hop against the URL security policy.
 * Prevents redirect-based SSRF bypasses.
 * @param url - The initial URL to fetch
 * @param options - Fetch options (must have redirect: 'manual')
 * @returns The final response and the manually validated request URL chain
 */
export async function fetchWithRedirectValidation(
  url: string,
  options: RequestInit,
  config: GeographySecurityConfig,
): Promise<{ response: Response; urls: string[] }> {
  let currentUrl = url;
  const urls = [url];

  for (let hop = 0; ; hop++) {
    const response = await fetch(currentUrl, options);

    if (response.type === 'opaqueredirect') {
      throw createGeographyFetchError(
        'SECURITY_ERROR',
        'Cannot validate an opaque redirect. Use the final resource URL directly.',
        currentUrl,
      );
    }

    // Retain the URLs we validated, rather than trusting Response.url.
    if (response.status < 300 || response.status >= 400) {
      return { response, urls };
    }

    // Cancel the unused redirect response body to release connection resources
    try {
      await response.body?.cancel();
    } catch {
      // Ignore cancellation errors — they must not mask redirect handling
    }

    if (hop === MAX_REDIRECTS) {
      throw createGeographyFetchError(
        'SECURITY_ERROR',
        `Too many redirects (exceeded ${MAX_REDIRECTS} hops)`,
        url,
      );
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
    validateGeographyUrl(redirectUrl, config);
    await rejectOnAbort(
      validateResolvedGeographyUrl(redirectUrl, config),
      options.signal,
    );

    currentUrl = redirectUrl;
    urls.push(redirectUrl);
  }
}

/**
 * Creates an abort controller with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @returns Object with controller and cleanup function
 */
export function createTimeoutController(timeoutMs: number): {
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
