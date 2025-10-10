import pino from 'pino';
import { config } from '../config/environment';

// Log contexts for structured logging
export const LOG_CONTEXTS = {
  AUTH: 'auth',
  TOKEN: 'token',
  DEEPGRAM: 'deepgram',
  PROMPT: 'prompt',
  HTTP: 'http',
  ERROR: 'error',
  STARTUP: 'startup',
  SHUTDOWN: 'shutdown',
} as const;

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

// Typed logger interface with context support
export interface Logger {
  debug: (context: LogContext, message: string, data?: Record<string, unknown>) => void;
  info: (context: LogContext, message: string, data?: Record<string, unknown>) => void;
  warn: (context: LogContext, message: string, data?: Record<string, unknown>) => void;
  error: (context: LogContext, message: string, error?: Error, data?: Record<string, unknown>) => void;
}

// Create structured logger
export const structuredLogger: Logger = {
  debug: (context: LogContext, message: string, data?: Record<string, unknown>) => {
    logger.debug({ context, ...data }, message);
  },

  info: (context: LogContext, message: string, data?: Record<string, unknown>) => {
    logger.info({ context, ...data }, message);
  },

  warn: (context: LogContext, message: string, data?: Record<string, unknown>) => {
    logger.warn({ context, ...data }, message);
  },

  error: (context: LogContext, message: string, error?: Error, data?: Record<string, unknown>) => {
    const errorData = error ? {
      error: {
        message: error.message,
        name: error.name,
        stack: isDevelopment ? error.stack : undefined,
      },
    } : undefined;

    logger.error({ context, ...errorData, ...data }, message);
  },
};

// Export convenience functions
export const logDebug = structuredLogger.debug;
export const logInfo = structuredLogger.info;
export const logWarn = structuredLogger.warn;
export const logError = structuredLogger.error;

// Export raw pino logger for special cases
export const rawLogger = logger;

export default structuredLogger;
