import { createGeographyFetchError } from './error-utils';

/**
 * Subresource Integrity (SRI) configuration for external geography data
 */
export interface SRIConfig {
  algorithm: 'sha256' | 'sha384' | 'sha512';
  hash: string;
  enforceIntegrity: boolean;
}

/**
 * Known SRI hashes for common geography data sources
 * These hashes are automatically generated and verified
 * Run 'npm run generate-sri' to update these hashes
 */
export const KNOWN_GEOGRAPHY_SRI: Record<string, SRIConfig> = {
  // World Atlas from unpkg.com - Countries data
  'https://unpkg.com/world-atlas@2/countries-110m.json': {
    algorithm: 'sha384',
    hash: 'sha384-yOCJ+8ShBm8UDqtAVtAvxTDDf4gXo5edxl/YG0FmVC5OTmqVLl7utuVGBDEeZWHf',
    enforceIntegrity: true,
  },
  'https://unpkg.com/world-atlas@2/countries-50m.json': {
    algorithm: 'sha384',
    hash: 'sha384-Aw4s9pX1PTPntIYkZ/qV9IYiF5Gv8eTl6Dd/TT56zfO1Wwd+owFwYUuuXNUMrWkc',
    enforceIntegrity: true,
  },
  // World Atlas from unpkg.com - Land data
  'https://unpkg.com/world-atlas@2/land-110m.json': {
    algorithm: 'sha384',
    hash: 'sha384-5oFOGoMd0tkagYW08lVco4uAi7XDEDBwBxOdeKx+SA1ihbsHiR/aFAJGretluTzG',
    enforceIntegrity: true,
  },
  'https://unpkg.com/world-atlas@2/land-50m.json': {
    algorithm: 'sha384',
    hash: 'sha384-c0VeCJd1wVbV5WQZNjf1hcMqPr9QXweEArnbdgS1k75TBNjta2M/NddyAulA/Glb',
    enforceIntegrity: true,
  },
} as const;

/**
 * Configuration for SRI enforcement
 */
export interface SRIEnforcementConfig {
  enforceForKnownSources: boolean;
  enforceForAllSources: boolean;
  allowUnknownSources: boolean;
  customSRIMap: Record<string, SRIConfig>;
}

export const DEFAULT_SRI_CONFIG: SRIEnforcementConfig = {
  enforceForKnownSources: true,
  enforceForAllSources: false, // Don't enforce for all sources by default
  allowUnknownSources: true, // Allow unknown sources by default
  customSRIMap: {},
};

let currentSRIConfig: SRIEnforcementConfig = DEFAULT_SRI_CONFIG;

/**
 * Configure SRI enforcement settings
 * @param config - SRI enforcement configuration
 */
export function configureSRI(config: Partial<SRIEnforcementConfig>): void {
  currentSRIConfig = {
    ...DEFAULT_SRI_CONFIG,
    ...config,
  };
}

/**
 * Enable strict SRI mode (enforce for all sources)
 */
export function enableStrictSRI(): void {
  currentSRIConfig = {
    ...currentSRIConfig,
    enforceForKnownSources: true,
    enforceForAllSources: true,
    allowUnknownSources: false,
  };
}

/**
 * Disable SRI enforcement (not recommended for production)
 */
export function disableSRI(): void {
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn('Disabling SRI in production is not recommended for security');
  }

  currentSRIConfig = {
    ...currentSRIConfig,
    enforceForKnownSources: false,
    enforceForAllSources: false,
    allowUnknownSources: true,
  };
}

/**
 * Calculate SHA hash of data
 * @param data - Data to hash
 * @param algorithm - Hash algorithm to use
 * @returns Promise resolving to base64-encoded hash
 */
async function calculateHash(
  data: ArrayBuffer,
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512',
): Promise<string> {
  // Use Web Crypto API (available in browsers and Node.js 16+)
  const hashBuffer = await globalThis.crypto.subtle.digest(algorithm, data);
  const hashArray = new Uint8Array(hashBuffer);

  // Convert to base64 (browser-compatible)
  let hashBase64: string;
  if (typeof globalThis.btoa !== 'undefined') {
    // Browser environment
    hashBase64 = globalThis.btoa(String.fromCharCode(...hashArray));
  } else {
    // Node.js environment - use manual base64 encoding
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    while (i < hashArray.length) {
      const a = hashArray[i++] || 0;
      const b = i < hashArray.length ? hashArray[i++] || 0 : 0;
      const c = i < hashArray.length ? hashArray[i++] || 0 : 0;
      const bitmap = (a << 16) | (b << 8) | c;
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result +=
        i - 2 < hashArray.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < hashArray.length ? chars.charAt(bitmap & 63) : '=';
    }
    hashBase64 = result;
  }

  return hashBase64;
}

/**
 * Validate response integrity using SRI
 * @param response - Fetch response to validate
 * @param url - URL of the resource
 * @param expectedSRI - Expected SRI configuration
 * @returns Promise resolving to validated response
 */
export async function validateSRI(
  response: Response,
  url: string,
  expectedSRI: SRIConfig,
): Promise<Response> {
  // Clone response to avoid consuming the body
  const responseClone = response.clone();
  const data = await responseClone.arrayBuffer();

  // Validate using the ArrayBuffer approach
  await validateSRIFromArrayBuffer(data, url, expectedSRI);

  return response;
}

/**
 * Validate ArrayBuffer integrity using SRI
 * @param arrayBuffer - Data to validate
 * @param url - URL of the resource
 * @param expectedSRI - Expected SRI configuration
 * @returns Promise that resolves if validation passes, throws if it fails
 */
export async function validateSRIFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  url: string,
  expectedSRI: SRIConfig,
): Promise<void> {
  // Calculate hash based on algorithm
  const algorithmMap = {
    sha256: 'SHA-256' as const,
    sha384: 'SHA-384' as const,
    sha512: 'SHA-512' as const,
  };

  const calculatedHash = await calculateHash(
    arrayBuffer,
    algorithmMap[expectedSRI.algorithm],
  );
  const expectedHash = expectedSRI.hash.replace(
    `${expectedSRI.algorithm}-`,
    '',
  );

  if (calculatedHash !== expectedHash) {
    const sriError = new Error(
      `Subresource Integrity check failed for ${url}. Expected ${expectedSRI.algorithm}-${expectedHash}, got ${expectedSRI.algorithm}-${calculatedHash}`,
    );
    (
      sriError as Error & {
        expectedHash?: string;
        calculatedHash?: string;
        algorithm?: string;
      }
    ).expectedHash = expectedSRI.hash;
    (
      sriError as Error & {
        expectedHash?: string;
        calculatedHash?: string;
        algorithm?: string;
      }
    ).calculatedHash = `${expectedSRI.algorithm}-${calculatedHash}`;
    (
      sriError as Error & {
        expectedHash?: string;
        calculatedHash?: string;
        algorithm?: string;
      }
    ).algorithm = expectedSRI.algorithm;

    throw createGeographyFetchError(
      'SECURITY_ERROR',
      sriError.message,
      url,
      sriError,
    );
  }
}

/**
 * Canonicalize a URL for SRI lookup.
 * Strips the fragment, removes default ports, normalises the hostname to
 * lowercase, and removes trailing slashes from the path so that minor URL
 * variants resolve to the same SRI entry.
 */
function canonicalizeUrlForSRI(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove fragment — it is never sent to the server
    parsed.hash = '';
    // URL constructor already lowercases the hostname and normalises the port,
    // but we explicitly clear the default port for safety.
    if (
      (parsed.protocol === 'https:' && parsed.port === '443') ||
      (parsed.protocol === 'http:' && parsed.port === '80')
    ) {
      parsed.port = '';
    }
    // Strip trailing slashes from the path (preserve root "/" and query/hash)
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.href;
  } catch {
    // If URL parsing fails, return as-is — the fetch will fail with a
    // validation error later anyway.
    return url;
  }
}

/**
 * Check if SRI validation is required for a URL.
 * The URL is canonicalized (fragment stripped, host lowercased, default port
 * removed) before lookup so that trivial URL variants don't bypass known
 * SRI entries.
 *
 * @param url - URL to check
 * @returns SRI configuration if validation is required, null otherwise
 */
export function getSRIForUrl(url: string): SRIConfig | null {
  const canonical = canonicalizeUrlForSRI(url);

  // Check custom SRI map first (canonical then raw)
  if (currentSRIConfig.customSRIMap[canonical]) {
    return currentSRIConfig.customSRIMap[canonical];
  }
  if (currentSRIConfig.customSRIMap[url]) {
    return currentSRIConfig.customSRIMap[url];
  }

  // Check known sources (canonical then raw)
  if (
    KNOWN_GEOGRAPHY_SRI[canonical] &&
    currentSRIConfig.enforceForKnownSources
  ) {
    return KNOWN_GEOGRAPHY_SRI[canonical];
  }
  if (KNOWN_GEOGRAPHY_SRI[url] && currentSRIConfig.enforceForKnownSources) {
    return KNOWN_GEOGRAPHY_SRI[url];
  }

  // If enforcing for all sources but no SRI available
  if (currentSRIConfig.enforceForAllSources) {
    if (!currentSRIConfig.allowUnknownSources) {
      throw createGeographyFetchError(
        'SECURITY_ERROR',
        `SRI enforcement is enabled but no integrity hash is available for ${url}`,
        url,
      );
    }
  }

  return null;
}

/**
 * Add custom SRI configuration for a URL
 * @param url - URL to add SRI for
 * @param sri - SRI configuration
 */
export function addCustomSRI(url: string, sri: SRIConfig): void {
  currentSRIConfig.customSRIMap[url] = sri;
}

/**
 * Generate SRI hash for a given URL (utility for developers)
 * This function fetches the resource and calculates its hash
 * @param url - URL to generate SRI for
 * @param algorithm - Hash algorithm to use
 * @returns Promise resolving to SRI hash string
 */
export async function generateSRIHash(
  url: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384',
): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const data = await response.arrayBuffer();
    const algorithmMap = {
      sha256: 'SHA-256' as const,
      sha384: 'SHA-384' as const,
      sha512: 'SHA-512' as const,
    };

    const hash = await calculateHash(data, algorithmMap[algorithm]);
    return `${algorithm}-${hash}`;
  } catch (error) {
    throw createGeographyFetchError(
      'GEOGRAPHY_LOAD_ERROR',
      `Failed to generate SRI hash for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Validate multiple URLs and generate SRI configuration
 * Utility function for setting up SRI for multiple geography sources
 * @param urls - Array of URLs to generate SRI for
 * @param algorithm - Hash algorithm to use
 * @returns Promise resolving to SRI configuration map
 */
export async function generateSRIForUrls(
  urls: string[],
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384',
): Promise<Record<string, SRIConfig>> {
  const sriMap: Record<string, SRIConfig> = {};

  for (const url of urls) {
    try {
      const hash = await generateSRIHash(url, algorithm);
      sriMap[url] = {
        algorithm,
        hash,
        enforceIntegrity: true,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to generate SRI for ${url}:`, error);
    }
  }

  return sriMap;
}
