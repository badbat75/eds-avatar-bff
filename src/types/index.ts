/**
 * Identity established by the bb-auth reverse-proxy gate.
 *
 * There is no token: nginx runs an `auth_request` against the gate and injects the
 * headers the gate returned. Only the email is guaranteed - the names come from
 * optional id-token claims, so either may be missing.
 * @interface AuthenticatedUser
 */
export interface AuthenticatedUser {
  /** Unique subject identifier: the gate keys on email */
  sub: string;
  /** Authorized email address forwarded by the gate */
  email: string;
  /** Fixed marker identifying the gate as the authenticating party */
  iss: string;
  /** Given name, absent when the id token carries no `given_name` claim */
  givenName?: string;
  /** Family name, absent when the id token carries no `family_name` claim */
  familyName?: string;
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
  /** The Deepgram access token */
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
  /** Request header carrying the authenticated email, set by the gate */
  gateIdentityHeader: string;
  /** Request header carrying the percent-encoded given name, set by the gate */
  gateGivenNameHeader: string;
  /** Request header carrying the percent-encoded family name, set by the gate */
  gateFamilyNameHeader: string;
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