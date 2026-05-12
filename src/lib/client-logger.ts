/**
 * Client-side logging utility
 * Mirrors the server logger API but runs in the browser
 * Can send errors to the server for centralized logging
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class ClientLogger {
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
  }

  /**
   * Formats a log message with timestamp and level
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context && Object.keys(context).length > 0
      ? ` | ${JSON.stringify(context)}`
      : '';

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Generic logging method
   */
  log(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('log', message, context);
    console.log(formatted);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('info', message, context);
    console.info(formatted);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
  }

  /**
   * Error level logging
   * Logs to console and sends to server via API
   */
  error(message: string, error?: Error | null, context?: LogContext): void {
    const formatted = this.formatMessage('error', message, context);

    if (error instanceof Error) {
      const stackTrace = this.isDev ? error.stack : error.message;
      console.error(`${formatted}\n${stackTrace}`);
    } else {
      console.error(formatted);
    }

    // Send error to server for centralized logging
    this.sendErrorToServer(message, error, context);
  }

  /**
   * Sends error to server endpoint for centralized logging
   * Runs asynchronously to not block UI
   */
  private sendErrorToServer(
    message: string,
    error?: Error | null,
    context?: LogContext
  ): void {
    if (typeof window === 'undefined') return; // Only in browser

    const payload = {
      message,
      errorMessage: error?.message,
      errorStack: error?.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Use fetch without await to not block execution
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      // Silently fail - don't let logging failures break the app
      console.error('Failed to send error to server:', err);
    });
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger();
