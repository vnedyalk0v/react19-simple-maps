import { GeographyError } from '../types';

/**
 * Creates a standardized geography fetch error
 * @param type - Error type
 * @param message - Error message
 * @param url - URL that caused the error (optional)
 * @param originalError - Original error that caused this error (optional)
 * @returns GeographyError instance
 */
export function createGeographyFetchError(
  type: GeographyError['type'],
  message: string,
  url?: string,
  originalError?: Error,
): GeographyError {
  const error = new Error(message) as GeographyError;
  error.name = 'GeographyError';
  error.type = type;
  error.timestamp = new Date().toISOString();

  if (url) {
    error.geography = url;
  }

  if (originalError) {
    error.cause = originalError;
    if (originalError.stack) {
      error.stack = originalError.stack;
    }
    error.details = {
      originalMessage: originalError.message,
      originalName: originalError.name,
    };
  }

  return error;
}

/**
 * Creates a validation error for invalid input
 * @param message - Error message
 * @param field - Field that failed validation
 * @param value - Invalid value
 * @returns GeographyError instance
 */
export function createValidationError(
  message: string,
  field: string,
  value: unknown,
): GeographyError {
  const error = createGeographyFetchError('VALIDATION_ERROR', message);

  (error as GeographyError & { field?: string; value?: unknown }).field = field;
  (error as GeographyError & { field?: string; value?: unknown }).value = value;

  return error;
}

/**
 * Creates a security error for unsafe operations
 * @param message - Error message
 * @param operation - Operation that was blocked
 * @returns GeographyError instance
 */
export function createSecurityError(
  message: string,
  operation: string,
): GeographyError {
  const error = createGeographyFetchError('SECURITY_ERROR', message);

  (error as GeographyError & { operation?: string }).operation = operation;

  return error;
}

// Error type guards
export function isGeographyError(error: unknown): error is GeographyError {
  if (!(error instanceof Error)) return false;

  const errorObj = error as unknown as Record<string, unknown>;
  return (
    'type' in errorObj &&
    typeof errorObj.type === 'string' &&
    [
      'GEOGRAPHY_LOAD_ERROR',
      'GEOGRAPHY_PARSE_ERROR',
      'PROJECTION_ERROR',
      'VALIDATION_ERROR',
      'SECURITY_ERROR',
      'CONFIGURATION_ERROR',
      'CONTEXT_ERROR',
    ].includes(errorObj.type)
  );
}
