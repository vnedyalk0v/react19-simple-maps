import { createGeographyFetchError } from './error-utils';

/**
 * Simple URL validation to avoid circular dependency
 * @param url - URL to validate
 * @returns Validated URL string
 */
function validateURL(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  // Basic URL validation
  try {
    new URL(url);
    return url.trim();
  } catch {
    throw new Error('Invalid URL format');
  }
}

// Security configuration for geography fetching
export interface GeographySecurityConfig {
  TIMEOUT_MS: number;
  MAX_RESPONSE_SIZE: number;
  ALLOWED_CONTENT_TYPES: readonly string[];
  ALLOWED_PROTOCOLS: readonly string[];
  ALLOW_HTTP_LOCALHOST: boolean; // Explicit configuration for HTTP localhost access
  STRICT_HTTPS_ONLY: boolean; // Force HTTPS-only mode
}

export const DEFAULT_GEOGRAPHY_FETCH_CONFIG: GeographySecurityConfig = {
  TIMEOUT_MS: 10000, // 10 seconds
  MAX_RESPONSE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_CONTENT_TYPES: ['application/json', 'application/geo+json'],
  ALLOWED_PROTOCOLS: ['https:'], // HTTPS only by default
  ALLOW_HTTP_LOCALHOST: false, // Disabled by default for security
  STRICT_HTTPS_ONLY: true, // Strict HTTPS-only mode by default
} as const;

// Development configuration (can be enabled explicitly)
export const DEVELOPMENT_GEOGRAPHY_FETCH_CONFIG: GeographySecurityConfig = {
  ...DEFAULT_GEOGRAPHY_FETCH_CONFIG,
  ALLOWED_PROTOCOLS: ['https:', 'http:'],
  ALLOW_HTTP_LOCALHOST: true, // Allow HTTP for localhost in development
  STRICT_HTTPS_ONLY: false,
} as const;

// Current active configuration (defaults to secure)
export let GEOGRAPHY_FETCH_CONFIG: GeographySecurityConfig =
  DEFAULT_GEOGRAPHY_FETCH_CONFIG;

/**
 * Configure geography fetching security settings
 * @param config - Security configuration to apply
 */
export function configureGeographySecurity(
  config: Partial<GeographySecurityConfig>,
): void {
  GEOGRAPHY_FETCH_CONFIG = {
    ...DEFAULT_GEOGRAPHY_FETCH_CONFIG,
    ...config,
  };
}

/**
 * Enable development mode with relaxed security (use with caution)
 * @param allowHttpLocalhost - Whether to allow HTTP for localhost
 */
export function enableDevelopmentMode(
  allowHttpLocalhost: boolean = true,
): void {
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      'Attempted to enable development mode in production - ignoring for security',
    );
    return;
  }

  GEOGRAPHY_FETCH_CONFIG = {
    ...DEVELOPMENT_GEOGRAPHY_FETCH_CONFIG,
    ALLOW_HTTP_LOCALHOST: allowHttpLocalhost,
  };

  // eslint-disable-next-line no-console
  console.warn(
    'Development mode enabled with relaxed security settings. Do not use in production!',
  );
}

/**
 * Checks if a hostname is a private IP address
 * @param hostname - The hostname to check
 * @returns True if the hostname is a private IP address
 */
function isPrivateIPAddress(hostname: string): boolean {
  // Skip non-IP hostnames
  if (!hostname || hostname === 'localhost') {
    return false;
  }

  // IPv4 private ranges
  const ipv4PrivateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^127\./, // 127.0.0.0/8 (loopback)
    /^169\.254\./, // 169.254.0.0/16 (link-local)
  ];

  // Check IPv4 private ranges
  for (const range of ipv4PrivateRanges) {
    if (range.test(hostname)) {
      return true;
    }
  }

  // IPv6 private ranges (simplified check)
  const ipv6PrivateRanges = [
    /^::1$/, // ::1 (loopback)
    /^fe80:/, // fe80::/10 (link-local)
    /^fc00:/, // fc00::/7 (unique local)
    /^fd00:/, // fd00::/8 (unique local)
  ];

  // Check IPv6 private ranges
  for (const range of ipv6PrivateRanges) {
    if (range.test(hostname)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a geography URL for security and format compliance
 * @param url - The URL to validate
 * @throws {Error} If the URL is invalid or insecure
 */
export function validateGeographyUrl(url: string): void {
  // Use comprehensive URL validation from input-validation module
  const validatedUrl = validateURL(url);

  try {
    const parsedUrl = new URL(validatedUrl);

    // Strict HTTPS-only mode
    if (GEOGRAPHY_FETCH_CONFIG.STRICT_HTTPS_ONLY) {
      if (parsedUrl.protocol !== 'https:') {
        throw createGeographyFetchError(
          'SECURITY_ERROR',
          `Strict HTTPS-only mode: ${parsedUrl.protocol} is not allowed. Only HTTPS is permitted.`,
          url,
        );
      }
    } else {
      // Check protocol security with configured protocols
      if (
        !GEOGRAPHY_FETCH_CONFIG.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)
      ) {
        const allowedProtocols =
          GEOGRAPHY_FETCH_CONFIG.ALLOWED_PROTOCOLS.join(', ');
        throw createGeographyFetchError(
          'SECURITY_ERROR',
          `Unsupported protocol: ${parsedUrl.protocol}. Only ${allowedProtocols} are allowed.`,
          url,
        );
      }

      // HTTP protocol validation
      if (parsedUrl.protocol === 'http:') {
        // Check if HTTP localhost is explicitly allowed
        if (!GEOGRAPHY_FETCH_CONFIG.ALLOW_HTTP_LOCALHOST) {
          throw createGeographyFetchError(
            'SECURITY_ERROR',
            'HTTP protocol is disabled for security. Use HTTPS or enable development mode explicitly.',
            url,
          );
        }

        // If HTTP localhost is allowed, validate hostname
        if (
          parsedUrl.hostname !== 'localhost' &&
          parsedUrl.hostname !== '127.0.0.1'
        ) {
          throw createGeographyFetchError(
            'SECURITY_ERROR',
            'HTTP protocol is only allowed for localhost. Use HTTPS for remote URLs.',
            url,
          );
        }

        // Additional production check
        if (process.env.NODE_ENV === 'production') {
          throw createGeographyFetchError(
            'SECURITY_ERROR',
            'HTTP localhost access is not allowed in production',
            url,
          );
        }

        // Development warning for HTTP localhost usage
        // eslint-disable-next-line no-console
        console.warn(
          `Security Warning: Using HTTP for localhost (${url}). This should only be used in development.`,
        );
      }
    }

    // Additional security checks for localhost access
    if (
      parsedUrl.hostname === 'localhost' ||
      parsedUrl.hostname === '127.0.0.1'
    ) {
      if (process.env.NODE_ENV === 'production') {
        throw createGeographyFetchError(
          'SECURITY_ERROR',
          'Localhost access is not allowed in production',
          url,
        );
      }
    }

    // Validate against private IP ranges (additional security)
    if (isPrivateIPAddress(parsedUrl.hostname)) {
      throw createGeographyFetchError(
        'SECURITY_ERROR',
        `Access to private IP address ${parsedUrl.hostname} is not allowed`,
        url,
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw createGeographyFetchError(
        'VALIDATION_ERROR',
        `Invalid URL format: ${url}`,
        url,
        error,
      );
    }
    throw error;
  }
}

/**
 * Ensure the response's Content-Type header matches the configured allowed geography content types.
 *
 * @param response - The fetch `Response` whose `Content-Type` header will be validated
 * @throws VALIDATION_ERROR if the `Content-Type` header is missing or not one of the configured allowed content types
 */
export function validateContentType(response: Response): void {
  const contentType = response.headers.get('content-type');
  if (!contentType) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'Missing Content-Type header',
    );
  }

  const isValidType = GEOGRAPHY_FETCH_CONFIG.ALLOWED_CONTENT_TYPES.some(
    (type) => contentType.toLowerCase().includes(type),
  );

  if (!isValidType) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Invalid content type: ${contentType}. Expected one of: ${GEOGRAPHY_FETCH_CONFIG.ALLOWED_CONTENT_TYPES.join(', ')}`,
    );
  }
}

/**
 * Performs a fast pre-check of the response's Content-Length header and rejects responses that declare a size larger than the configured maximum.
 *
 * The Content-Length header may be missing or incorrect; this check does not guarantee the actual byte count of the body.
 *
 * @param response - The fetch Response to inspect
 * @throws {Error} If Content-Length is present and indicates a size greater than GEOGRAPHY_FETCH_CONFIG.MAX_RESPONSE_SIZE
 */
export async function validateResponseSize(response: Response): Promise<void> {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > GEOGRAPHY_FETCH_CONFIG.MAX_RESPONSE_SIZE) {
      throw createGeographyFetchError(
        'VALIDATION_ERROR',
        `Response too large: ${size} bytes. Maximum allowed: ${GEOGRAPHY_FETCH_CONFIG.MAX_RESPONSE_SIZE} bytes`,
      );
    }
  }
}

/**
 * Read and return the response body as an ArrayBuffer while enforcing a maximum byte limit.
 *
 * @param maxBytes - Maximum allowed bytes for the response body; defaults to `GEOGRAPHY_FETCH_CONFIG.MAX_RESPONSE_SIZE`
 * @returns The response body as an `ArrayBuffer`
 * @throws `VALIDATION_ERROR` when the response body exceeds `maxBytes`
 */
export async function readResponseWithSizeLimit(
  response: Response,
  maxBytes: number = GEOGRAPHY_FETCH_CONFIG.MAX_RESPONSE_SIZE,
): Promise<ArrayBuffer> {
  const reader = response.body?.getReader();

  // Fallback: if ReadableStream is not available, read the whole body and check size.
  // NOTE: response.arrayBuffer() loads the entire response into memory before the size
  // check runs, which can cause high memory usage or OOM for very large responses.
  // The ReadableStream path above is preferred as it streams data and enforces the
  // size limit incrementally, failing fast without buffering the full payload.
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw createGeographyFetchError(
        'VALIDATION_ERROR',
        `Response too large: ${buffer.byteLength} bytes exceeds limit of ${maxBytes} bytes`,
      );
    }
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      reader.cancel().catch(() => {});
      throw createGeographyFetchError(
        'VALIDATION_ERROR',
        `Response too large: exceeded limit of ${maxBytes} bytes`,
      );
    }
    chunks.push(value);
  }

  // Concatenate chunks into a single ArrayBuffer
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}

/**
 * Validates that the parsed data is a valid geography object
 * @param data - The parsed JSON data to validate
 * @throws {Error} If data is not a valid geography object
 */
export function validateGeographyData(data: unknown): void {
  if (!data || typeof data !== 'object') {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'Invalid geography data: not a valid object',
    );
  }

  const obj = data as Record<string, unknown>;
  if (
    !obj.type ||
    (obj.type !== 'Topology' && obj.type !== 'FeatureCollection')
  ) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Invalid geography data: expected Topology or FeatureCollection, got ${obj.type}`,
    );
  }
}