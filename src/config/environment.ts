import dotenv from 'dotenv';
import { EnvironmentConfig } from '../types';

// Load environment variables
dotenv.config();

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function parseIntEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return parsed;
}

function parseArrayEnvVar(name: string, defaultValue: string[]): string[] {
  const value = process.env[name];
  if (!value) return defaultValue;

  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export const config: EnvironmentConfig = {
  host: getOptionalEnvVar('HOST', '0.0.0.0'),
  port: parseIntEnvVar('PORT', 3001),
  nodeEnv: getOptionalEnvVar('NODE_ENV', 'development'),
  jwtSecret: getRequiredEnvVar('JWT_SECRET'),
  jwtIssuer: getOptionalEnvVar('JWT_ISSUER', 'eds-avatar-bff'),
  jwtAudience: getOptionalEnvVar('JWT_AUDIENCE', 'eds-avatar-frontend'),
  jwtAlgorithm: getOptionalEnvVar('JWT_ALGORITHM', 'RS256'),
  jwtVerifyAlgorithms: parseArrayEnvVar('JWT_VERIFY_ALGORITHMS', ['RS256', 'HS256']),
  jwksCacheMaxEntries: parseIntEnvVar('JWKS_CACHE_MAX_ENTRIES', 5),
  jwksCacheMaxAgeMs: parseIntEnvVar('JWKS_CACHE_MAX_AGE_MS', 600000), // 10 minutes
  jwksRequestTimeoutMs: parseIntEnvVar('JWKS_REQUEST_TIMEOUT_MS', 30000), // 30 seconds
  deepgramApiKey: getRequiredEnvVar('DEEPGRAM_API_KEY'),
  deepgramTokenTtlMinutes: parseIntEnvVar('DEEPGRAM_TOKEN_TTL_MINUTES', 15),
  allowedOrigins: parseArrayEnvVar('ALLOWED_ORIGINS', ['http://localhost:8080']),
  rateLimitWindowMs: parseIntEnvVar('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: parseIntEnvVar('RATE_LIMIT_MAX_REQUESTS', 100),
};

// Validate configuration
export function validateConfig(config: EnvironmentConfig): void {
  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  if (!['development', 'production', 'test'].includes(config.nodeEnv)) {
    console.warn(`Unknown NODE_ENV: ${config.nodeEnv}`);
  }

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

// Validate on module load
validateConfig(config);