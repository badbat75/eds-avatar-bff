/**
 * Structured logging utility using Pino logger
 * @module utils/logger
 */

import pino from 'pino';
import { config } from '../config/environment';

/**
 * Available log contexts for categorizing log messages
 * @constant LOG_CONTEXTS
 */
export const LOG_CONTEXTS = {
  /** Authentication and authorization operations */
  AUTH: 'auth',
  /** Token generation and validation */
  TOKEN: 'token',
  /** Deepgram API interactions */
  DEEPGRAM: 'deepgram',
  /** Prompt service operations */
  PROMPT: 'prompt',
  /** HTTP request/response logging */
  HTTP: 'http',
  /** Error handling and reporting */
  ERROR: 'error',
  /** Application startup operations */
  STARTUP: 'startup',
  /** Application shutdown operations */
  SHUTDOWN: 'shutdown',
  /** General API operations */
  API: 'api',
} as const;

/**
 * Type-safe log context derived from LOG_CONTEXTS
 * @type LogContext
 */
export type LogContext = typeof LOG_CONTEXTS[keyof typeof LOG_CONTEXTS];

// Create base logger configuration
const isDevelopment = config.nodeEnv === 'development';

// Create logger with environment-specific configuration
const loggerOptions = {
  level: config.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: false,
      translateTime: false,
      ignore: isDevelopment ? 'pid,hostname,time' : 'pid,hostname,time,env,service',
      singleLine: true,
      messageFormat: '[{context}] {msg}',
      levelFirst: true,
      customLevels: 'trace:10,debug:20,info:30,warn:40,error:50,fatal:60',
    },
  },
  base: {
    env: config.nodeEnv,
    service: 'eds-avatar-bff',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'token',
      'apiKey',
      'password',
      'secret',
    ],
    censor: '[REDACTED]',
  },
};

const logger = pino(loggerOptions);

/**
 * Typed logger interface with context support
 * @interface Logger
 */
export interface Logger {
  /**
   * Log debug-level message (verbose diagnostic information)
   * @param context - Log context category
   * @param message - Log message
   * @param data - Additional data to include in log entry
   */
  debug: (context: LogContext, message: string, data?: Record<string, unknown>) => void;

  /**
   * Log info-level message (general informational events)
   * @param context - Log context category
   * @param message - Log message
   * @param data - Additional data to include in log entry
   */
  info: (context: LogContext, message: string, data?: Record<string, unknown>) => void;

  /**
   * Log warn-level message (potentially harmful situations)
   * @param context - Log context category
   * @param message - Log message
   * @param data - Additional data to include in log entry
   */
  warn: (context: LogContext, message: string, data?: Record<string, unknown>) => void;

  /**
   * Log error-level message (error events)
   * @param context - Log context category
   * @param message - Log message
   * @param error - Error object with stack trace
   * @param data - Additional data to include in log entry
   */
  error: (context: LogContext, message: string, error?: Error, data?: Record<string, unknown>) => void;
}

/**
 * Extracts correlation ID from data object if present
 * @param data - Optional data object that may contain correlationId
 * @returns Object with separated correlationId and remaining data
 * @internal
 */
function extractCorrelationId(data?: Record<string, unknown>): { correlationId?: string, rest: Record<string, unknown> } {
  if (!data) {
    return { rest: {} };
  }

  const { correlationId, ...rest } = data;
  return {
    correlationId: typeof correlationId === 'string' ? correlationId : undefined,
    rest,
  };
}

/**
 * Structured logger instance with context and correlation ID support
 * @constant structuredLogger
 */
export const structuredLogger: Logger = {
  debug: (context: LogContext, message: string, data?: Record<string, unknown>) => {
    const { correlationId, rest } = extractCorrelationId(data);
    logger.debug({ context, correlationId, ...rest }, message);
  },

  info: (context: LogContext, message: string, data?: Record<string, unknown>) => {
    const { correlationId, rest } = extractCorrelationId(data);
    logger.info({ context, correlationId, ...rest }, message);
  },

  warn: (context: LogContext, message: string, data?: Record<string, unknown>) => {
    const { correlationId, rest } = extractCorrelationId(data);
    logger.warn({ context, correlationId, ...rest }, message);
  },

  error: (context: LogContext, message: string, error?: Error, data?: Record<string, unknown>) => {
    const { correlationId, rest } = extractCorrelationId(data);
    const errorData = error ? {
      error: {
        message: error.message,
        name: error.name,
        stack: isDevelopment ? error.stack : undefined,
      },
    } : undefined;

    logger.error({ context, correlationId, ...errorData, ...rest }, message);
  },
};

/**
 * Convenience function for debug-level logging
 * @function logDebug
 * @see {@link Logger.debug}
 */
export const logDebug = structuredLogger.debug;

/**
 * Convenience function for info-level logging
 * @function logInfo
 * @see {@link Logger.info}
 */
export const logInfo = structuredLogger.info;

/**
 * Convenience function for warn-level logging
 * @function logWarn
 * @see {@link Logger.warn}
 */
export const logWarn = structuredLogger.warn;

/**
 * Convenience function for error-level logging
 * @function logError
 * @see {@link Logger.error}
 */
export const logError = structuredLogger.error;

/**
 * Raw Pino logger instance for special cases and advanced usage
 * @constant rawLogger
 */
export const rawLogger = logger;

export default structuredLogger;
