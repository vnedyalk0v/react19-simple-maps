export interface GeographySecurityConfig {
    TIMEOUT_MS: number;
    MAX_RESPONSE_SIZE: number;
    ALLOWED_CONTENT_TYPES: readonly string[];
    ALLOWED_PROTOCOLS: readonly string[];
    ALLOW_HTTP_LOCALHOST: boolean;
    STRICT_HTTPS_ONLY: boolean;
}
export declare const DEFAULT_GEOGRAPHY_FETCH_CONFIG: GeographySecurityConfig;
export declare const DEVELOPMENT_GEOGRAPHY_FETCH_CONFIG: GeographySecurityConfig;
export declare let GEOGRAPHY_FETCH_CONFIG: GeographySecurityConfig;
/**
 * Configure geography fetching security settings
 * @param config - Security configuration to apply
 */
export declare function configureGeographySecurity(config: Partial<GeographySecurityConfig>): void;
/**
 * Enable development mode with relaxed security (use with caution)
 * @param allowHttpLocalhost - Whether to allow HTTP for localhost
 */
export declare function enableDevelopmentMode(allowHttpLocalhost?: boolean): void;
/**
 * Validates a geography URL for security and format compliance
 * @param url - The URL to validate
 * @throws {Error} If the URL is invalid or insecure
 */
export declare function validateGeographyUrl(url: string): void;
/**
 * Validates response content type
 * @param response - The fetch response to validate
 * @throws {Error} If content type is invalid
 */
export declare function validateContentType(response: Response): void;
/**
 * Validates response size to prevent memory issues
 * @param response - The fetch response to validate
 * @throws {Error} If response is too large
 */
export declare function validateResponseSize(response: Response): Promise<void>;
/**
 * Validates that the parsed data is a valid geography object
 * @param data - The parsed JSON data to validate
 * @throws {Error} If data is not a valid geography object
 */
export declare function validateGeographyData(data: unknown): void;
//# sourceMappingURL=geography-validation.d.ts.map