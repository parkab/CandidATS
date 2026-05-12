/**
 * @jest-environment node
 */
import {
  AppError,
  classifyError,
  createErrorResponse,
  validationError,
  authError,
  notFoundError,
  conflictError,
  databaseError,
  serviceError,
} from '@/lib/errors';

describe('AppError', () => {
  it('should create an AppError with message, status code, and type', () => {
    const error = new AppError('Test error', 400, 'validation');

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.type).toBe('validation');
    expect(error.isOperational).toBe(true);
    expect(error.timestamp).toBeDefined();
  });

  it('should include context in the error object', () => {
    const context = { field: 'email' };
    const error = new AppError('Invalid email', 400, 'validation', context);

    expect(error.context).toEqual(context);
  });

  it('should inherit from Error class', () => {
    const error = new AppError('Test', 400, 'unknown');

    expect(error instanceof Error).toBe(true);
    expect(error.stack).toBeDefined();
  });
});

describe('classifyError', () => {
  it('should return correct type and status for AppError', () => {
    const error = new AppError('Test', 400, 'validation');
    const result = classifyError(error);

    expect(result).toEqual({ type: 'validation', statusCode: 400 });
  });

  it('should classify SyntaxError as validation error', () => {
    const error = new SyntaxError('Invalid JSON');
    const result = classifyError(error);

    expect(result).toEqual({ type: 'validation', statusCode: 400 });
  });

  it('should classify ReferenceError as unknown server error', () => {
    const error = new ReferenceError('undefined variable');
    const result = classifyError(error);

    expect(result).toEqual({ type: 'unknown', statusCode: 500 });
  });

  it('should default unknown errors to server error', () => {
    const error = 'Some string error';
    const result = classifyError(error);

    expect(result).toEqual({ type: 'unknown', statusCode: 500 });
  });
});

describe('createErrorResponse', () => {
  it('should create standardized error response JSON', () => {
    const response = createErrorResponse('Test error', 400);

    expect(response).toHaveProperty('error.message', 'Test error');
    expect(response).toHaveProperty('error.timestamp');
    expect(response.error.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('should include context in error response when provided', () => {
    const context = { field: 'email', value: 'invalid' };
    const response = createErrorResponse('Validation failed', 400, context);

    expect(response.error.context).toEqual(context);
  });

  it('should not include context when not provided', () => {
    const response = createErrorResponse('Error', 500);

    expect(response.error.context).toBeUndefined();
  });
});

describe('Error helpers', () => {
  it('validationError creates 400 validation error', () => {
    const error = validationError('Invalid input', { field: 'name' });

    expect(error.statusCode).toBe(400);
    expect(error.type).toBe('validation');
    expect(error.message).toBe('Invalid input');
    expect(error.context).toEqual({ field: 'name' });
  });

  it('authError creates 401 auth error', () => {
    const error = authError('Invalid credentials');

    expect(error.statusCode).toBe(401);
    expect(error.type).toBe('auth');
    expect(error.message).toBe('Invalid credentials');
  });

  it('notFoundError creates 404 error with resource name', () => {
    const error = notFoundError('User', { userId: '123' });

    expect(error.statusCode).toBe(404);
    expect(error.type).toBe('notfound');
    expect(error.message).toBe('User not found');
  });

  it('conflictError creates 409 conflict error', () => {
    const error = conflictError('Email already registered');

    expect(error.statusCode).toBe(409);
    expect(error.type).toBe('conflict');
  });

  it('databaseError creates 500 database error', () => {
    const error = databaseError('Query failed', { query: 'SELECT ...' });

    expect(error.statusCode).toBe(500);
    expect(error.type).toBe('database');
  });

  it('serviceError creates 503 service error with service name', () => {
    const error = serviceError('Stripe');

    expect(error.statusCode).toBe(503);
    expect(error.type).toBe('service');
    expect(error.message).toBe('Stripe service unavailable');
  });
});
