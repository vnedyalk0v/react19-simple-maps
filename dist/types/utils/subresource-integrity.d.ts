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
export declare const KNOWN_GEOGRAPHY_SRI: Record<string, SRIConfig>;
/**
 * Configuration for SRI enforcement
 */
export interface SRIEnforcementConfig {
    enforceForKnownSources: boolean;
    enforceForAllSources: boolean;
    allowUnknownSources: boolean;
    customSRIMap: Record<string, SRIConfig>;
}
export declare const DEFAULT_SRI_CONFIG: SRIEnforcementConfig;
/**
 * Configure SRI enforcement settings
 * @param config - SRI enforcement configuration
 */
export declare function configureSRI(config: Partial<SRIEnforcementConfig>): void;
/**
 * Enable strict SRI mode (enforce for all sources)
 */
export declare function enableStrictSRI(): void;
/**
 * Disable SRI enforcement (not recommended for production)
 */
export declare function disableSRI(): void;
/**
 * Validate response integrity using SRI
 * @param response - Fetch response to validate
 * @param url - URL of the resource
 * @param expectedSRI - Expected SRI configuration
 * @returns Promise resolving to validated response
 */
export declare function validateSRI(response: Response, url: string, expectedSRI: SRIConfig): Promise<Response>;
/**
 * Validate ArrayBuffer integrity using SRI
 * @param arrayBuffer - Data to validate
 * @param url - URL of the resource
 * @param expectedSRI - Expected SRI configuration
 * @returns Promise that resolves if validation passes, throws if it fails
 */
export declare function validateSRIFromArrayBuffer(arrayBuffer: ArrayBuffer, url: string, expectedSRI: SRIConfig): Promise<void>;
/**
 * Check if SRI validation is required for a URL
 * @param url - URL to check
 * @returns SRI configuration if validation is required, null otherwise
 */
export declare function getSRIForUrl(url: string): SRIConfig | null;
/**
 * Add custom SRI configuration for a URL
 * @param url - URL to add SRI for
 * @param sri - SRI configuration
 */
export declare function addCustomSRI(url: string, sri: SRIConfig): void;
/**
 * Generate SRI hash for a given URL (utility for developers)
 * This function fetches the resource and calculates its hash
 * @param url - URL to generate SRI for
 * @param algorithm - Hash algorithm to use
 * @returns Promise resolving to SRI hash string
 */
export declare function generateSRIHash(url: string, algorithm?: 'sha256' | 'sha384' | 'sha512'): Promise<string>;
/**
 * Validate multiple URLs and generate SRI configuration
 * Utility function for setting up SRI for multiple geography sources
 * @param urls - Array of URLs to generate SRI for
 * @param algorithm - Hash algorithm to use
 * @returns Promise resolving to SRI configuration map
 */
export declare function generateSRIForUrls(urls: string[], algorithm?: 'sha256' | 'sha384' | 'sha512'): Promise<Record<string, SRIConfig>>;
//# sourceMappingURL=subresource-integrity.d.ts.map