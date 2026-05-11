/**
 * API Error Handler Wrapper
 * Provides centralized error handling for Next.js API routes
 * 
 * Usage:
 * export const POST = withErrorHandler(async (req) => {
 *   // Your route logic here
 *   throw new AppError('Something went wrong', 400, 'validation');
 * });
 * 
 * With dynamic segments:
 * export const GET = withErrorHandler(async (req, context) => {
 *   const { id } = await context.params;
 *   // Your route logic here
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleError, AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

type Handler = (req: NextRequest, context?: unknown) => Promise<NextResponse<unknown>>;

/**
 * Higher-order function that wraps API route handlers with error handling
 * Catches all errors and returns standardized error responses
 * Supports both simple routes and dynamic segment routes with context parameter
 */
export function withErrorHandler(handler: Handler): Handler {
  return async (req: NextRequest, context?: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (handler as any)(req, context);
      return response;
    } catch (error) {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;

      logger.warn(`Route error caught by error handler`, {
        path,
        method,
        errorType: error instanceof AppError ? error.type : 'unknown',
      });

      return handleError(error, path, method);
    }
  };
}

/**
 * Alternative: Utility function for inline error handling in routes
 * For routes that don't use withErrorHandler wrapper
 * 
 * Usage:
 * export async function POST(request: NextRequest) {
 *   try {
 *     // Your logic here
 *   } catch (error) {
 *     return handleRouteError(error, request);
 *   }
 * }
 */
export function handleRouteError(error: unknown, request: NextRequest): NextResponse<unknown> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  return handleError(error, path, method);
}
