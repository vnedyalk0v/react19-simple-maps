import type { Coordinates, ProjectionConfig, GeographySecurityConfig, SRIConfig } from '../types';
/**
 * Input validation configuration
 */
export interface ValidationConfig {
    strictMode: boolean;
    allowUnsafeContent: boolean;
    maxStringLength: number;
    maxArrayLength: number;
    maxObjectDepth: number;
}
export declare const DEFAULT_VALIDATION_CONFIG: ValidationConfig;
/**
 * Configure input validation settings
 * @param config - Validation configuration
 */
export declare function configureValidation(config: Partial<ValidationConfig>): void;
/**
 * Sanitize string input to prevent injection attacks
 * @param input - String to sanitize
 * @param allowHTML - Whether to allow HTML content
 * @returns Sanitized string
 */
export declare function sanitizeString(input: unknown, allowHTML?: boolean): string;
/**
 * Validate and sanitize URL input
 * @param input - URL to validate
 * @returns Validated URL string
 */
export declare function validateURL(input: unknown): string;
/**
 * Validate numeric input with range checking
 * @param input - Number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validated number
 */
export declare function validateNumber(input: unknown, min?: number, max?: number): number;
/**
 * Validate coordinates input
 * @param input - Coordinates to validate
 * @returns Validated coordinates
 */
export declare function validateCoordinates(input: unknown): Coordinates;
/**
 * Validate array input with length and content validation
 * @param input - Array to validate
 * @param itemValidator - Function to validate each item
 * @returns Validated array
 */
export declare function validateArray<T>(input: unknown, itemValidator?: (item: unknown, index: number) => T): T[];
/**
 * Validate object input with depth checking
 * @param input - Object to validate
 * @param depth - Current depth (for recursion)
 * @returns Validated object
 */
export declare function validateObject(input: unknown, depth?: number): Record<string, unknown>;
/**
 * Validate projection configuration
 * @param input - Projection config to validate
 * @returns Validated projection config
 */
export declare function validateProjectionConfig(input: unknown): ProjectionConfig;
/**
 * Sanitize SVG content to prevent XSS attacks
 * @param svgContent - SVG content to sanitize
 * @returns Sanitized SVG content
 */
export declare function sanitizeSVG(svgContent: string): string;
/**
 * Validate geography security configuration
 * @param input - Security config to validate
 * @returns Validated security config
 */
export declare function validateSecurityConfig(input: unknown): Partial<GeographySecurityConfig>;
/**
 * Validate SRI configuration
 * @param input - SRI config to validate
 * @returns Validated SRI config
 */
export declare function validateSRIConfig(input: unknown): SRIConfig;
/**
 * Validate and sanitize CSS class names
 * @param input - Class name to validate
 * @returns Sanitized class name
 */
export declare function validateClassName(input: unknown): string;
/**
 * Validate and sanitize style objects for SVG elements
 * @param input - Style object to validate
 * @returns Sanitized style object
 */
export declare function validateStyleObject(input: unknown): Record<string, string | number>;
/**
 * Validate event handler functions
 * @param input - Event handler to validate
 * @returns Validated event handler or undefined
 */
export declare function validateEventHandler(input: unknown): Function | undefined;
/**
 * Comprehensive validation for component props
 * @param props - Props object to validate
 * @param allowedProps - List of allowed property names
 * @returns Validated props object
 */
export declare function validateComponentProps(props: unknown, allowedProps: readonly string[]): Record<string, unknown>;
//# sourceMappingURL=input-validation.d.ts.map