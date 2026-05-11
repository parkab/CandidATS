/**
 * Centralized error handling utilities
 * Defines error classification, AppError class, and response builders
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Error types for classification
 */
export type ErrorType = 'validation' | 'auth' | 'database' | 'service' | 'notfound' | 'conflict' | 'unknown';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    type: ErrorType = 'unknown',
    context?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);

    this.statusCode = statusCode;
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Classifies error and returns appropriate HTTP status code
 */
export function classifyError(error: unknown): { type: ErrorType; statusCode: number } {
  if (error instanceof AppError) {
    return {
      type: error.type,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof SyntaxError) {
    return { type: 'validation', statusCode: 400 };
  }

  if (error instanceof ReferenceError || error instanceof TypeError) {
    return { type: 'unknown', statusCode: 500 };
  }

  // Default to server error for unknown errors
  return { type: 'unknown', statusCode: 500 };
}

/**
 * Creates a standardized error response JSON
 */
export function createErrorResponse(
  message: string,
  statusCode: number,
  context?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  
  return {
    error: {
      message,
      timestamp,
      ...(context && { context }),
    },
  };
}

/**
 * Handles and logs errors, returning a standardized NextResponse
 */
export function handleError(
  error: unknown,
  requestPath?: string,
  requestMethod?: string
): NextResponse<unknown> {
  const { type, statusCode } = classifyError(error);

  let message: string;
  let logContext: Record<string, unknown> = {
    type,
    statusCode,
    path: requestPath,
    method: requestMethod,
  };

  if (error instanceof AppError) {
    message = error.message;
    if (error.context) {
      logContext = { ...logContext, ...error.context };
    }
    logger.error(`${type} error: ${message}`, error, logContext);
  } else if (error instanceof Error) {
    message = statusCode === 500 ? 'Internal server error' : error.message;
    logContext.originalError = error.message;
    logger.error(`${type} error: ${error.message}`, error, logContext);
  } else {
    message = statusCode === 500 ? 'Internal server error' : 'An unexpected error occurred';
    logger.error(`${type} error: Unknown error occurred`, null, logContext);
  }

  // Expose detailed message only for client-side errors (validation, auth)
  const clientMessage = statusCode < 500 ? message : 'Internal server error';

  return NextResponse.json(
    createErrorResponse(clientMessage, statusCode),
    { status: statusCode }
  );
}

/**
 * Helper function for validation errors
 */
export function validationError(
  message: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, 400, 'validation', context);
}

/**
 * Helper function for authentication errors
 */
export function authError(
  message: string = 'Unauthorized',
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, 401, 'auth', context);
}

/**
 * Helper function for not found errors
 */
export function notFoundError(
  resource: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError(`${resource} not found`, 404, 'notfound', context);
}

/**
 * Helper function for conflict errors
 */
export function conflictError(
  message: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, 409, 'conflict', context);
}

/**
 * Helper function for database errors
 */
export function databaseError(
  message: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, 500, 'database', context);
}

/**
 * Helper function for external service errors
 */
export function serviceError(
  service: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError(`${service} service unavailable`, 503, 'service', context);
}

/**
 * Generic application error
 */
export function appError(
  message: string,
  statusCode: number = 500,
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, statusCode, 'unknown', context);
}
