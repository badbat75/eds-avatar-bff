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
 * Parses a comma-separated array environment variable
 * @param name - Environment variable name
 * @param defaultValue - Default array if not set
 * @returns Array of trimmed, non-empty strings
 */
function parseArrayEnvVar(name: string, defaultValue: string[]): string[] {
  const value = process.env[name];
  if (!value) {
return defaultValue;
}

  return value.split(',').map(item => item.trim()).filter(Boolean);
}

const nodeEnv = getOptionalEnvVar('NODE_ENV', 'development');

/**
 * Application configuration object loaded from environment variables
 * @constant config
 */
export const config: EnvironmentConfig = {
  host: getOptionalEnvVar('HOST', '0.0.0.0'),
  port: parseIntEnvVar('PORT', 3001),
  nodeEnv,
  logLevel: getLogLevel(nodeEnv),
  jwtSecret: getRequiredEnvVar('JWT_SECRET'),
  jwtIssuer: getOptionalEnvVar('JWT_ISSUER', 'eds-avatar-bff'),
  jwtAudience: getOptionalEnvVar('JWT_AUDIENCE', 'eds-avatar-frontend'),
  jwtAlgorithm: getOptionalEnvVar('JWT_ALGORITHM', 'RS256'),
  jwtVerifyAlgorithms: parseArrayEnvVar('JWT_VERIFY_ALGORITHMS', ['RS256', 'HS256']),
  jwksCacheMaxEntries: parseIntEnvVar('JWKS_CACHE_MAX_ENTRIES', 5),
  jwksCacheMaxAgeMs: parseIntEnvVar('JWKS_CACHE_MAX_AGE_MS', 600000), // 10 minutes
  jwksRequestTimeoutMs: parseIntEnvVar('JWKS_REQUEST_TIMEOUT_MS', 30000), // 30 seconds
  deepgramApiKey: getRequiredEnvVar('DEEPGRAM_API_KEY'),
  deepgramProjectId: process.env.DEEPGRAM_PROJECT_ID,
  deepgramTokenTtlMinutes: parseIntEnvVar('DEEPGRAM_TOKEN_TTL_MINUTES', 15),
  allowedOrigins: parseArrayEnvVar('ALLOWED_ORIGINS', ['http://localhost:8080']),
  rateLimitWindowMs: parseIntEnvVar('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: parseIntEnvVar('RATE_LIMIT_MAX_REQUESTS', 100),
};

/**
 * Validates the application configuration
 * @param config - Configuration object to validate
 * @throws {Error} If any configuration value is invalid
 */
export function validateConfig(config: EnvironmentConfig): void {
  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  // Allow any NODE_ENV, just log if it's unusual
  // This avoids import cycles with logger during config initialization

  if (config.allowedOrigins.length === 0) {
    throw new Error('At least one allowed origin must be specified');
  }

  if (config.deepgramTokenTtlMinutes < 1 || config.deepgramTokenTtlMinutes > 1440) {
    throw new Error('DEEPGRAM_TOKEN_TTL_MINUTES must be between 1 and 1440 minutes (24 hours)');
  }

  // Validate JWT cipher configuration
  const validAlgorithms = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'];

  if (!validAlgorithms.includes(config.jwtAlgorithm)) {
    throw new Error(`JWT_ALGORITHM must be one of: ${validAlgorithms.join(', ')}`);
  }

  const invalidAlgorithms = config.jwtVerifyAlgorithms.filter(alg => !validAlgorithms.includes(alg));
  if (invalidAlgorithms.length > 0) {
    throw new Error(`JWT_VERIFY_ALGORITHMS contains invalid algorithms: ${invalidAlgorithms.join(', ')}`);
  }

  if (config.jwksCacheMaxEntries < 1 || config.jwksCacheMaxEntries > 100) {
    throw new Error('JWKS_CACHE_MAX_ENTRIES must be between 1 and 100');
  }

  if (config.jwksCacheMaxAgeMs < 60000 || config.jwksCacheMaxAgeMs > 3600000) {
    throw new Error('JWKS_CACHE_MAX_AGE_MS must be between 60000ms (1 minute) and 3600000ms (1 hour)');
  }

  if (config.jwksRequestTimeoutMs < 5000 || config.jwksRequestTimeoutMs > 60000) {
    throw new Error('JWKS_REQUEST_TIMEOUT_MS must be between 5000ms (5 seconds) and 60000ms (1 minute)');
  }
}

/**
 * Constructs a JWKS URI from an issuer URL
 * @param issuer - The JWT issuer URL (e.g., 'https://example.auth0.com/')
 * @returns The JWKS URI (e.g., 'https://example.auth0.com/.well-known/jwks.json')
 * @throws Error if the issuer URL is malformed
 */
export function constructJwksUri(issuer: string): string {
  try {
    // Parse the issuer URL
    const url = new URL(issuer);

    // Validate protocol
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error(`Invalid issuer protocol: ${url.protocol}. Must be http: or https:`);
    }

    // Ensure path ends with trailing slash for proper URL joining
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/';
    }

    // Construct JWKS URI by appending the well-known path
    url.pathname += '.well-known/jwks.json';

    return url.toString();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid issuer URL format: ${issuer}`);
    }
    throw error;
  }
}

// Validate on module load
validateConfig(config);