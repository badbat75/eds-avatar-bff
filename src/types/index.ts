export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface DeepgramTokenRequest {
  userId: string;
  sessionId?: string;
}

export interface DeepgramTokenResponse {
  token: string;
  expiresIn: number;
  expiresAt: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface EnvironmentConfig {
  host: string;
  port: number;
  nodeEnv: string;
  logLevel: LogLevel;
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtAlgorithm: string;
  jwtVerifyAlgorithms: string[];
  jwksCacheMaxEntries: number;
  jwksCacheMaxAgeMs: number;
  jwksRequestTimeoutMs: number;
  deepgramApiKey: string;
  deepgramTokenTtlMinutes: number;
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}