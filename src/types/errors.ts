/**
 * Type definitions for error handling
 */

/**
 * Standard error response returned by API endpoints
 */
export interface ErrorResponse {
  error: {
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Error classification for mapping errors to HTTP status codes
 */
export type ErrorClassification = 'validation' | 'auth' | 'database' | 'service' | 'notfound' | 'conflict' | 'unknown';

/**
 * Context information logged with errors
 */
export interface ErrorContext {
  path?: string;
  method?: string;
  userId?: string;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Success response wrapper (optional, for consistency)
 */
export interface SuccessResponse<T = unknown> {
  data: T;
  timestamp: string;
}
