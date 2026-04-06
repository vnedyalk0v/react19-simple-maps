import { createGeographyFetchError } from './error-utils';
import { validateURL } from './input-validation';

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

function isProductionEnvironment(): boolean {
  return (
    typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
  );
}

function createGeographyFetchConfig(
  config: Partial<GeographySecurityConfig>,
): GeographySecurityConfig {
  const nextConfig: GeographySecurityConfig = {
    ...DEFAULT_GEOGRAPHY_FETCH_CONFIG,
    ...config,
    ALLOWED_CONTENT_TYPES: [
      ...(config.ALLOWED_CONTENT_TYPES ??
        DEFAULT_GEOGRAPHY_FETCH_CONFIG.ALLOWED_CONTENT_TYPES),
    ],
    ALLOWED_PROTOCOLS: [
      ...(config.ALLOWED_PROTOCOLS ??
        DEFAULT_GEOGRAPHY_FETCH_CONFIG.ALLOWED_PROTOCOLS),
    ],
  };

  if (isProductionEnvironment()) {
    nextConfig.STRICT_HTTPS_ONLY = true;
    nextConfig.ALLOW_HTTP_LOCALHOST = false;
    nextConfig.ALLOWED_PROTOCOLS = [
      ...DEFAULT_GEOGRAPHY_FETCH_CONFIG.ALLOWED_PROTOCOLS,
    ];
  }

  return Object.freeze({
    ...nextConfig,
    ALLOWED_CONTENT_TYPES: Object.freeze([...nextConfig.ALLOWED_CONTENT_TYPES]),
    ALLOWED_PROTOCOLS: Object.freeze([...nextConfig.ALLOWED_PROTOCOLS]),
  });
}

// Current active configuration (defaults to secure)
export let GEOGRAPHY_FETCH_CONFIG: GeographySecurityConfig =
  createGeographyFetchConfig({});

/**
 * Configure geography fetching security settings
 * @param config - Security configuration to apply
 */
export function configureGeographySecurity(
  config: Partial<GeographySecurityConfig>,
): void {
  GEOGRAPHY_FETCH_CONFIG = createGeographyFetchConfig(config);
}

export function getGeographySecurityConfig(): GeographySecurityConfig {
  return GEOGRAPHY_FETCH_CONFIG;
}

/**
 * Enable development mode with relaxed security (use with caution)
 * @param allowHttpLocalhost - Whether to allow HTTP for localhost
 */
export function enableDevelopmentMode(
  allowHttpLocalhost: boolean = true,
): void {
  if (isProductionEnvironment()) {
    // eslint-disable-next-line no-console
    console.warn(
      'Attempted to enable development mode in production - ignoring for security',
    );
    return;
  }

  GEOGRAPHY_FETCH_CONFIG = createGeographyFetchConfig({
    ...DEVELOPMENT_GEOGRAPHY_FETCH_CONFIG,
    ALLOW_HTTP_LOCALHOST: allowHttpLocalhost,
  });

  // eslint-disable-next-line no-console
  console.warn(
    'Development mode enabled with relaxed security settings. Do not use in production!',
  );
}

/**
 * Strips IPv6 brackets from a hostname returned by `new URL().hostname`.
 * `new URL("https://[::1]/")` yields hostname `[::1]`; we need bare `::1`.
 */
function stripIPv6Brackets(hostname: string): string {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

/**
 * Checks if a hostname is a private/reserved IP address.
 *
 * Handles both IPv4 and IPv6 (including IPv4-mapped IPv6 like `::ffff:127.0.0.1`).
 * The hostname is normalised (bracket-stripped) before matching so that values
 * produced by `new URL().hostname` are correctly classified.
 *
 * @param hostname - The hostname to check (may include IPv6 brackets)
 * @returns True if the hostname is a private/reserved IP address
 */
export function isPrivateIPAddress(hostname: string): boolean {
  if (!hostname || hostname === 'localhost') {
    return false;
  }

  // Normalise: strip IPv6 brackets so regexes can match
  const normalised = stripIPv6Brackets(hostname);

  // --- IPv4 private / reserved ranges ---
  const ipv4PrivateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^127\./, // 127.0.0.0/8 (loopback)
    /^169\.254\./, // 169.254.0.0/16 (link-local)
    /^0\./, // 0.0.0.0/8 (current network)
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64.0.0/10 (carrier-grade NAT)
    /^192\.0\.0\./, // 192.0.0.0/24 (IETF protocol assignments)
    /^192\.0\.2\./, // 192.0.2.0/24 (TEST-NET-1, RFC 5737)
    /^198\.51\.100\./, // 198.51.100.0/24 (TEST-NET-2, RFC 5737)
    /^203\.0\.113\./, // 203.0.113.0/24 (TEST-NET-3, RFC 5737)
    /^198\.1[89]\./, // 198.18.0.0/15 (benchmark testing)
    /^233\.252\.0\./, // 233.252.0.0/24 (documentation)
  ];

  for (const range of ipv4PrivateRanges) {
    if (range.test(normalised)) {
      return true;
    }
  }

  // --- IPv6 private / reserved ranges ---
  const ipv6PrivateRanges = [
    /^::1$/i, // ::1 (loopback)
    /^fe[89ab][0-9a-f]:/i, // fe80::/10 (link-local) — covers fe80:–febf:
    /^f[cd][0-9a-f]{2}:/i, // fc00::/7 (unique local) — covers fc00:–fdff:
    /^::$/i, // :: (unspecified address)
    /^ff[0-9a-f]{2}:/i, // ff00::/8 (multicast)
    /^100::/i, // 100::/64 (discard prefix)
    /^2001:db8:/i, // 2001:db8::/32 (documentation)
    // 2001:0000::/32 (Teredo): matches "2001:" then either "::" or 1–4 zero hextets
    // before the next colon (e.g. "2001:0:", "2001:00:", "2001:0000:", "2001::").
    /^2001:(?:0{1,4}:|:)/i,
  ];

  for (const range of ipv6PrivateRanges) {
    if (range.test(normalised)) {
      return true;
    }
  }

  // --- IPv4-mapped IPv6 ---
  // Dotted-quad form: ::ffff:127.0.0.1
  const ipv4MappedDottedMatch = normalised.match(
    /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i,
  );
  if (ipv4MappedDottedMatch?.[1]) {
    return isPrivateIPAddress(ipv4MappedDottedMatch[1]);
  }

  // Hex form: ::ffff:7f00:1 (how URL constructor normalises ::ffff:127.0.0.1)
  const ipv4MappedHexMatch = normalised.match(
    /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i,
  );
  if (ipv4MappedHexMatch?.[1] && ipv4MappedHexMatch[2]) {
    const hi = parseInt(ipv4MappedHexMatch[1], 16);
    const lo = parseInt(ipv4MappedHexMatch[2], 16);
    const reconstructed = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateIPAddress(reconstructed);
  }

  return false;
}

type HostnameAddressResolver = (hostname: string) => Promise<string[]>;

function shouldResolveHostnamesForSecurity(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.release?.name === 'node' &&
    typeof window === 'undefined'
  );
}

async function loadNodeDnsModule(): Promise<{
  lookup?: (
    hostname: string,
    options: { all: true; verbatim: true },
  ) => Promise<Array<{ address: string }>>;
} | null> {
  if (typeof process !== 'undefined') {
    const builtinModule =
      typeof process.getBuiltinModule === 'function'
        ? (process.getBuiltinModule('node:dns/promises') as {
            lookup?: (
              hostname: string,
              options: { all: true; verbatim: true },
            ) => Promise<Array<{ address: string }>>;
          } | null)
        : null;

    if (builtinModule?.lookup) {
      return builtinModule;
    }
  }

  try {
    const specifier = 'node:dns/promises';
    const importedModule = (await import(/* @vite-ignore */ specifier)) as {
      lookup?: (
        hostname: string,
        options: { all: true; verbatim: true },
      ) => Promise<Array<{ address: string }>>;
    };

    return importedModule.lookup ? importedModule : null;
  } catch {
    return null;
  }
}

async function resolveHostnameAddresses(hostname: string): Promise<string[]> {
  if (!shouldResolveHostnamesForSecurity()) {
    return [];
  }

  const bareHostname = stripIPv6Brackets(hostname);
  if (!bareHostname) {
    return [];
  }

  const dnsModule = await loadNodeDnsModule();

  if (!dnsModule?.lookup) {
    throw createGeographyFetchError(
      'SECURITY_ERROR',
      `Unable to resolve hostname ${bareHostname} for security validation`,
      bareHostname,
    );
  }

  try {
    const records = await dnsModule.lookup(bareHostname, {
      all: true,
      verbatim: true,
    });
    return records.map((record) => record.address);
  } catch (error) {
    throw createGeographyFetchError(
      'SECURITY_ERROR',
      `Unable to resolve hostname ${bareHostname} for security validation`,
      bareHostname,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Validates a geography URL for security and format compliance
 * @param url - The URL to validate
 * @throws {Error} If the URL is invalid or insecure
 */
export function validateGeographyUrl(
  url: string,
  config: GeographySecurityConfig = GEOGRAPHY_FETCH_CONFIG,
): void {
  const validatedUrl = validateURL(url);

  try {
    const parsedUrl = new URL(validatedUrl);

    // Strict HTTPS-only mode
    if (config.STRICT_HTTPS_ONLY) {
      if (parsedUrl.protocol !== 'https:') {
        throw createGeographyFetchError(
          'SECURITY_ERROR',
          `Strict HTTPS-only mode: ${parsedUrl.protocol} is not allowed. Only HTTPS is permitted.`,
          url,
        );
      }
    } else {
      // Check protocol security with configured protocols
      if (!config.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
        const allowedProtocols = config.ALLOWED_PROTOCOLS.join(', ');
        throw createGeographyFetchError(
          'SECURITY_ERROR',
          `Unsupported protocol: ${parsedUrl.protocol}. Only ${allowedProtocols} are allowed.`,
          url,
        );
      }

      // HTTP protocol validation
      if (parsedUrl.protocol === 'http:') {
        // Check if HTTP localhost is explicitly allowed
        if (!config.ALLOW_HTTP_LOCALHOST) {
          throw createGeographyFetchError(
            'SECURITY_ERROR',
            'HTTP protocol is disabled for security. Use HTTPS or enable development mode explicitly.',
            url,
          );
        }

        // If HTTP localhost is allowed, validate hostname (including IPv6 loopback)
        const httpHost = stripIPv6Brackets(parsedUrl.hostname);
        if (
          httpHost !== 'localhost' &&
          httpHost !== '127.0.0.1' &&
          httpHost !== '::1'
        ) {
          throw createGeographyFetchError(
            'SECURITY_ERROR',
            'HTTP protocol is only allowed for localhost. Use HTTPS for remote URLs.',
            url,
          );
        }

        // Additional production check
        if (isProductionEnvironment()) {
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

    // Additional security checks for localhost access (including IPv6 loopback)
    const bareHostname = stripIPv6Brackets(parsedUrl.hostname);
    if (
      bareHostname === 'localhost' ||
      bareHostname === '127.0.0.1' ||
      bareHostname === '::1'
    ) {
      if (isProductionEnvironment()) {
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

export async function validateResolvedGeographyUrl(
  url: string,
  config: GeographySecurityConfig = GEOGRAPHY_FETCH_CONFIG,
  resolveAddresses: HostnameAddressResolver = resolveHostnameAddresses,
): Promise<void> {
  validateGeographyUrl(url, config);

  if (
    resolveAddresses === resolveHostnameAddresses &&
    !shouldResolveHostnamesForSecurity()
  ) {
    return;
  }

  const { hostname } = new URL(url);
  const bareHostname = stripIPv6Brackets(hostname);
  if (
    !bareHostname ||
    bareHostname === 'localhost' ||
    isPrivateIPAddress(hostname)
  ) {
    return;
  }

  const resolvedAddresses = await resolveAddresses(bareHostname);
  if (
    resolvedAddresses.some((resolvedAddress) =>
      isPrivateIPAddress(resolvedAddress),
    )
  ) {
    throw createGeographyFetchError(
      'SECURITY_ERROR',
      `Hostname ${bareHostname} resolves to a private IP address, which is not allowed`,
      url,
    );
  }
}

/**
 * Validates response content type
 * @param response - The fetch response to validate
 * @throws {Error} If content type is invalid
 */
export function validateContentType(
  response: Response,
  config: GeographySecurityConfig = GEOGRAPHY_FETCH_CONFIG,
): void {
  const contentType = response.headers.get('content-type');
  if (!contentType) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      'Missing Content-Type header',
    );
  }

  const mimeType = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  const isValidType = config.ALLOWED_CONTENT_TYPES.includes(mimeType);

  if (!isValidType) {
    throw createGeographyFetchError(
      'VALIDATION_ERROR',
      `Invalid content type: ${contentType}. Expected one of: ${config.ALLOWED_CONTENT_TYPES.join(', ')}`,
    );
  }
}

/**
 * Fast pre-check of Content-Length header to reject obviously oversized responses.
 * NOTE: This is only a pre-check — the header can be omitted or falsified.
 * Use {@link readResponseWithSizeLimit} for authoritative enforcement.
 * @param response - The fetch response to validate
 * @throws {Error} If Content-Length exceeds the configured maximum
 */
export async function validateResponseSize(
  response: Response,
  config: GeographySecurityConfig = GEOGRAPHY_FETCH_CONFIG,
): Promise<void> {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > config.MAX_RESPONSE_SIZE) {
      throw createGeographyFetchError(
        'VALIDATION_ERROR',
        `Response too large: ${size} bytes. Maximum allowed: ${config.MAX_RESPONSE_SIZE} bytes`,
      );
    }
  }
}

/**
 * Reads the response body as an ArrayBuffer while enforcing a hard byte-count limit.
 * Protects against responses that omit or falsify Content-Length.
 * @param response - The fetch response to read
 * @param maxBytes - Maximum allowed bytes (defaults to GEOGRAPHY_FETCH_CONFIG.MAX_RESPONSE_SIZE)
 * @returns The response body as ArrayBuffer
 * @throws {Error} If the body exceeds the byte limit
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
