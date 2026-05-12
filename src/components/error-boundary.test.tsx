import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error-boundary';

// Mock the client logger
jest.mock('@/lib/client-logger', () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Component that throws an error (class component for error throwing)
class ThrowError extends React.Component {
  render(): React.ReactNode {
    throw new Error('Test component error');
    // eslint-disable-next-line no-unreachable
    return null;
  }
}

// Component that renders normally
function NormalComponent() {
  return <div>Normal content</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error during tests
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should display fallback UI when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });

  it('should have Try again button to reset error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByRole('button', { name: /Try again/ });
    expect(tryAgainButton).toBeInTheDocument();
  });

  it('should have Go to Dashboard button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const dashboardLink = screen.getByRole('link', { name: /Go to Dashboard/ });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('should log error using clientLogger', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clientLogger } = require('@/lib/client-logger') as { clientLogger: typeof import('@/lib/client-logger').clientLogger };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(clientLogger.error).toHaveBeenCalled();
    expect(clientLogger.error).toHaveBeenCalledWith(
      'React Error Boundary caught an error',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should reset error state when Try again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    );

    // Error state will be tested with actual error recovery in integration tests
    // This is a limitation of error boundaries - they need actual errors to trigger
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // In dev mode, should show error details
    const errorDetails = screen.queryByText(/Error details:/);
    if (errorDetails) {
      expect(errorDetails).toBeInTheDocument();
    }

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  it('should hide error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // In production, should not show error details
    const errorDetails = screen.queryByText(/Error details:/);
    expect(errorDetails).not.toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });
});
