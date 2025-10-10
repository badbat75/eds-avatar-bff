/**
 * JWT token payload structure for authentication
 * @interface JwtPayload
 */
export interface JwtPayload {
  /** Unique subject identifier (user ID) */
  sub: string;
  /** User's email address */
  email: string;
  /** User's display name (optional) */
  name?: string;
  /** Token issued at timestamp (Unix epoch seconds) */
  iat: number;
  /** Token expiration timestamp (Unix epoch seconds) */
  exp: number;
  /** Token issuer (Auth0 domain or BFF service) */
  iss: string;
  /** Token audience (intended recipient) */
  aud: string;
}

/**
 * Request payload for generating a Deepgram token
 * @interface DeepgramTokenRequest
 */
export interface DeepgramTokenRequest {
  /** Unique identifier for the user requesting the token */
  userId: string;
  /** Optional session identifier for tracking */
  sessionId?: string;
}

/**
 * Response payload containing a generated Deepgram token
 * @interface DeepgramTokenResponse
 */
export interface DeepgramTokenResponse {
  /** The Deepgram access token (JWT format) */
  token: string;
  /** Token lifetime in seconds */
  expiresIn: number;
  /** ISO 8601 timestamp when the token expires */
  expiresAt: string;
}

/**
 * Standardized API error response structure
 * @interface ApiError
 */
export interface ApiError {
  /** Error category (e.g., 'Unauthorized', 'Validation Error') */
  error: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Machine-readable error code (e.g., 'AUTH_REQUIRED', 'VALIDATION_FAILED') */
  code: string;
  /** Additional error context and metadata */
  context?: Record<string, unknown>;
}

/**
 * Logging severity levels
 * @type LogLevel
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Application environment configuration
 * @interface EnvironmentConfig
 */
export interface EnvironmentConfig {
  /** Server binding host (e.g., '0.0.0.0' for all interfaces) */
  host: string;
  /** Server listening port */
  port: number;
  /** Node environment (development, production, test) */
  nodeEnv: string;
  /** Logging level for the application */
  logLevel: LogLevel;
  /** Secret key for signing JWT tokens */
  jwtSecret: string;
  /** JWT issuer identifier (Auth0 domain URL) */
  jwtIssuer: string;
  /** JWT audience identifier (intended recipient) */
  jwtAudience: string;
  /** Algorithm used to sign outgoing JWT tokens */
  jwtAlgorithm: string;
  /** Allowed algorithms for verifying incoming JWT tokens */
  jwtVerifyAlgorithms: string[];
  /** Maximum number of JWKS keys to cache */
  jwksCacheMaxEntries: number;
  /** Maximum age of cached JWKS keys in milliseconds */
  jwksCacheMaxAgeMs: number;
  /** Timeout for JWKS requests in milliseconds */
  jwksRequestTimeoutMs: number;
  /** Deepgram API key for authentication */
  deepgramApiKey: string;
  /** Optional explicit Deepgram project ID (defaults to first project if not set) */
  deepgramProjectId?: string;
  /** Deepgram token time-to-live in minutes */
  deepgramTokenTtlMinutes: number;
  /** Rate limiting time window in milliseconds */
  rateLimitWindowMs: number;
  /** Maximum requests allowed per rate limit window */
  rateLimitMaxRequests: number;
}