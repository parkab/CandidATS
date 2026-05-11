/**
 * Centralized logging utility for the application.
 * Provides structured logging with multiple levels: log, info, warn, error
 * All logs include timestamp, level, and optional context
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
  }

  /**
   * Formats a log message with timestamp, level, and optional context
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
   * Logs stack trace if error object is provided
   */
  error(message: string, error?: Error | null, context?: LogContext): void {
    const formatted = this.formatMessage('error', message, context);
    
    if (error instanceof Error) {
      // In development, show full stack trace; in production, just the message
      const stackTrace = this.isDev ? error.stack : error.message;
      console.error(`${formatted}\n${stackTrace}`);
    } else {
      console.error(formatted);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
