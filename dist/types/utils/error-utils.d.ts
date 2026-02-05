import { GeographyError } from '../types';
/**
 * Creates a standardized geography fetch error
 * @param type - Error type
 * @param message - Error message
 * @param url - URL that caused the error (optional)
 * @param originalError - Original error that caused this error (optional)
 * @returns GeographyError instance
 */
export declare function createGeographyFetchError(type: GeographyError['type'], message: string, url?: string, originalError?: Error): GeographyError;
/**
 * Creates a validation error for invalid input
 * @param message - Error message
 * @param field - Field that failed validation
 * @param value - Invalid value
 * @returns GeographyError instance
 */
export declare function createValidationError(message: string, field: string, value: unknown): GeographyError;
/**
 * Creates a security error for unsafe operations
 * @param message - Error message
 * @param operation - Operation that was blocked
 * @returns GeographyError instance
 */
export declare function createSecurityError(message: string, operation: string): GeographyError;
//# sourceMappingURL=error-utils.d.ts.map