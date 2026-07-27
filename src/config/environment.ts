/**
 * Environment configuration and validation module
 * @module config/environment
 */

import dotenv from 'dotenv';
import { EnvironmentConfig, LogLevel } from '../types';

// Load environment variables
dotenv.config();

/**
 * Gets a required environment variable or throws an error
 * @param name - Environment variable name
 * @returns The environment variable value
 * @throws {Error} If the environment variable is not set
 */
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Gets an optional environment variable with a default value
 * @param name - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default
 */
function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Determines the log level based on environment configuration
 * @param nodeEnv - Node environment (development, production, test)
 * @returns The resolved log level
 */
function getLogLevel(nodeEnv: string): LogLevel {
  const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
  const validLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

  if (envLogLevel && validLevels.includes(envLogLevel as LogLevel)) {
    return envLogLevel as LogLevel;
  }

  // Default based on NODE_ENV
  return nodeEnv === 'development' ? 'debug' : 'info';
}

/**
 * Parses an integer environment variable with validation
 * @param name - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns The parsed integer value
 * @throws {Error} If the value is not a valid number
 */
function parseIntEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) {
return defaultValue;
}

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return parsed;
}

/**
 * True for addresses that only accept connections originating on this host.
 * The gate's identity header is trusted, so anything able to reach the port can
 * impersonate any user — binding must not leave the host.
 * @param host - The configured bind address
 * @returns Whether the address is loopback-only
 */
function isLoopbackBindHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost';
}

const nodeEnv = getOptionalEnvVar('NODE_ENV', 'development');

/**
 * Application configuration object loaded from environment variables
 * @constant config
 */
export const config: EnvironmentConfig = {
  // Loopback by default: the gate identity header is only trustworthy while the
  // reverse proxy is the sole reachable path to this service (see validateConfig)
  host: getOptionalEnvVar('HOST', '127.0.0.1'),
  port: parseIntEnvVar('PORT', 3001),
  nodeEnv,
  logLevel: getLogLevel(nodeEnv),
  gateIdentityHeader: getOptionalEnvVar('GATE_IDENTITY_HEADER', 'x-auth-email').toLowerCase(),
  gateGivenNameHeader: getOptionalEnvVar('GATE_GIVEN_NAME_HEADER', 'x-auth-given-name').toLowerCase(),
  gateFamilyNameHeader: getOptionalEnvVar(
    'GATE_FAMILY_NAME_HEADER',
    'x-auth-family-name'
  ).toLowerCase(),
  deepgramApiKey: getRequiredEnvVar('DEEPGRAM_API_KEY'),
  deepgramProjectId: process.env.DEEPGRAM_PROJECT_ID,
  deepgramTokenTtlMinutes: parseIntEnvVar('DEEPGRAM_TOKEN_TTL_MINUTES', 15),
  rateLimitWindowMs: parseIntEnvVar('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: parseIntEnvVar('RATE_LIMIT_MAX_REQUESTS', 100),
};

/**
 * Validates the application configuration
 * @param config - Configuration object to validate
 * @throws {Error} If any configuration value is invalid
 */
export function validateConfig(config: EnvironmentConfig): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  // The reverse proxy is the only authentication: it overwrites the identity header
  // on every request it forwards, so a caller that could reach this port directly
  // would be free to set the header itself. Refuse to start reachable from off-host.
  if (!isLoopbackBindHost(config.host)) {
    throw new Error(
      `HOST must be loopback (127.0.0.1 or ::1), got: ${config.host}. ` +
        "The gate's identity header is only trustworthy when the reverse proxy is the sole reachable path."
    );
  }

  if (!config.gateIdentityHeader.trim()) {
    throw new Error('GATE_IDENTITY_HEADER must not be empty');
  }

  // Allow any NODE_ENV, just log if it's unusual
  // This avoids import cycles with logger during config initialization

  if (config.deepgramTokenTtlMinutes < 1 || config.deepgramTokenTtlMinutes > 1440) {
    throw new Error('DEEPGRAM_TOKEN_TTL_MINUTES must be between 1 and 1440 minutes (24 hours)');
  }
}

// Validate on module load
validateConfig(config);