# Error Handling and Logging Guide

## Overview

This guide explains how to use the centralized error handling and logging system in the CandidATS application.

## Core Components

### 1. Logger (`logger.ts`)

Server-side logging utility for structured logging.

**Usage:**

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.log('User action completed');
logger.info('User logged in', { userId: '123' });
logger.warn('Rate limit approaching', { userId: '123', remaining: 10 });
logger.error('Database connection failed', error, { database: 'postgres' });
```

**Methods:**
- `log(message, context?)` - Generic logging
- `info(message, context?)` - Info level
- `warn(message, context?)` - Warning level
- `error(message, error?, context?)` - Error level (includes stack trace in dev mode)

**Context:**
- Pass an object with relevant data about the event
- Automatically serialized to JSON in logs
- Useful for debugging: `{ userId, email, path, statusCode, etc }`

---

### 2. Error Classes and Helpers (`errors.ts`)

Create typed, standardized errors with proper HTTP status codes.

**AppError Class:**

```typescript
import { AppError, validationError, authError, notFoundError } from '@/lib/errors';

// Creating errors using helpers (preferred)
throw validationError('Email is required');
throw authError('Invalid credentials');
throw notFoundError('User');  // → "User not found"
throw conflictError('Email already registered');
throw databaseError('Failed to fetch user');
throw serviceError('Stripe');  // → "Stripe service unavailable"

// Or create custom AppError
throw new AppError('Custom error', 400, 'validation', { field: 'email' });
```

**Error Types:**
- `validation` (400) - User input validation failed
- `auth` (401) - Authentication failed
- `notfound` (404) - Resource not found
- `conflict` (409) - Resource conflict (e.g., duplicate)
- `database` (500) - Database operation failed
- `service` (503) - External service unavailable
- `unknown` (500) - Unknown error

**Error Handler:**

```typescript
import { handleError } from '@/lib/errors';

try {
  // Some operation
} catch (error) {
  // Returns standardized NextResponse with error
  return handleError(error, '/api/jobs', 'POST');
}
```

---

### 3. API Error Handler Wrapper (`error-handler.ts`)

Provides centralized error handling for API routes.

**Option 1: Using withErrorHandler Wrapper (Recommended)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/app/api/error-handler';
import { validationError, authError } from '@/lib/errors';

async function handler(req: NextRequest) {
  const body = await req.json();
  
  if (!body.email) {
    throw validationError('Email is required');
  }
  
  // Errors thrown here are caught and logged automatically
  // Returns standardized error response
  
  return NextResponse.json({ success: true });
}

export const POST = withErrorHandler(handler);
```

**Option 2: Using handleRouteError**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/app/api/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Your logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, request);
  }
}
```

---

### 4. Client-Side Logger (`client-logger.ts`)

Browser-side logging that automatically sends errors to the server.

**Usage:**

```typescript
'use client';

import { clientLogger } from '@/lib/client-logger';

// Same API as server logger
clientLogger.log('Button clicked');
clientLogger.info('Form submitted');
clientLogger.warn('API taking long');
clientLogger.error('Failed to fetch data', error, { endpoint: '/api/jobs' });
```

**Auto-Server Sending:**
- When `error()` is called, the error is automatically sent to `/api/logs`
- Includes: error message, stack trace, URL, user agent
- Non-blocking - failures are silently ignored
- No impact on user experience

---

### 5. Error Boundary (`error-boundary.tsx`)

React Error Boundary catches component errors and logs them.

**Already Integrated:**
- Root layout wraps all children with `<ErrorBoundary>`
- Catches any component crash automatically
- Displays friendly fallback UI
- Logs error to server via client logger

**Accessing:**

```typescript
// Already wrapped in root layout - you don't need to add it
// But if you want to add nested error boundaries:

import { ErrorBoundary } from '@/components/error-boundary';

export function MyComponent() {
  return (
    <ErrorBoundary>
      <SomeComponentThatMightError />
    </ErrorBoundary>
  );
}
```

---

## Patterns and Examples

### API Route Migration Template

Before:
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    // ... more logic with manual error handling
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

After:
```typescript
import { withErrorHandler } from '@/app/api/error-handler';
import { validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

async function handler(req: NextRequest) {
  const body = await req.json();
  
  if (!body.email) {
    throw validationError('Email is required');
  }
  
  logger.info('Processing request', { email: body.email });
  
  // ... rest of logic - errors automatically caught and logged
  
  return NextResponse.json({ success: true });
}

export const POST = withErrorHandler(handler);
```

### Component Error Handling

For try-catch in components:

```typescript
'use client';

import { clientLogger } from '@/lib/client-logger';

export function MyComponent() {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/submit', { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) {
        // Error responses already have error.message from server
        throw new Error(data.error?.message || 'Failed to submit');
      }
    } catch (error) {
      clientLogger.error('Failed to submit form', error as Error, {
        field: 'myForm',
      });
      // Show user-friendly toast/alert
    }
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Best Practices

1. **Always throw AppError or use helpers** - Ensures consistent status codes and formatting
2. **Include context** - Always add relevant context to logs (userId, email, path, etc.)
3. **Don't expose internal details** - Server logs can show internal errors; client gets generic message
4. **Use appropriate log levels** - `warn` for expected errors, `error` for unexpected
5. **Log with context** - Always include: who, what, when, where: `{ userId, action, path, method }`
6. **Don't catch and ignore** - Always log or re-throw
7. **Validation → 400** - User input errors are validation errors
8. **Auth failure → 401** - Invalid credentials are auth errors
9. **Not found → 404** - Missing resources
10. **Server errors → 500** - Unexpected errors that should be logged with full details

---

## Error Response Format

All API errors return this format:

```json
{
  "error": {
    "message": "User-friendly error message",
    "timestamp": "2024-05-10T14:30:00Z"
  }
}
```

Status codes follow HTTP standards:
- `400` - Validation/Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Migration Checklist

When migrating an existing API route:

- [ ] Wrap handler with `withErrorHandler()`
- [ ] Replace manual error returns with `throw validationError()` etc.
- [ ] Remove try-catch blocks (unless you have special recovery logic)
- [ ] Replace `console.error()` with `logger.error()`
- [ ] Add context to all logger calls
- [ ] Test: validation error → 400 response
- [ ] Test: auth error → 401 response
- [ ] Test: unhandled error → 500 response

---

## Troubleshooting

**"Logger not working"**
- Ensure you imported: `import { logger } from '@/lib/logger'`
- Check NODE_ENV for dev/prod behavior differences

**"Error not reaching server"**
- Check browser console for network errors
- Verify `/api/logs` endpoint is working
- Check that fetch requests aren't blocked by CORS

**"Component errors not caught"**
- ErrorBoundary only catches render errors, not event handlers
- For event handler errors, use clientLogger.error() manually
- Check that ErrorBoundary is imported correctly ('use client' directive)

---

## Next Steps

- [ ] Migrate remaining auth routes
- [ ] Migrate job/document routes
- [ ] Add request correlation IDs for tracing
- [ ] Set up centralized log aggregation (external service)
- [ ] Create monitoring dashboards
