import { AppError } from '../middleware/errorHandler';

// Re-export AppError for convenience
export { AppError };

/**
 * Error catalog with predefined error codes and factory functions
 * for creating structured, client-friendly errors
 */

// Authentication Errors (AUTH_*)
export function createAuthenticationError(
  message: string = 'Authentication required',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 401, 'AUTH_REQUIRED', true, context);
}

export function createInvalidTokenError(
  message: string = 'Invalid authentication token',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 401, 'AUTH_INVALID_TOKEN', true, context);
}

export function createTokenExpiredError(
  message: string = 'Authentication token has expired',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 401, 'AUTH_TOKEN_EXPIRED', true, context);
}

export function createMissingTokenError(
  message: string = 'No authentication token provided',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 401, 'AUTH_TOKEN_MISSING', true, context);
}

export function createInsufficientPermissionsError(
  message: string = 'Insufficient permissions to access this resource',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 403, 'AUTH_INSUFFICIENT_PERMISSIONS', true, context);
}

// Validation Errors (VALIDATION_*)
export function createValidationError(
  message: string,
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 400, 'VALIDATION_FAILED', true, context);
}

export function createMissingFieldError(
  fieldName: string,
  context?: Record<string, unknown>,
): AppError {
  return new AppError(
    `Required field '${fieldName}' is missing`,
    400,
    'VALIDATION_MISSING_FIELD',
    true,
    { field: fieldName, ...context },
  );
}

export function createInvalidFieldError(
  fieldName: string,
  reason: string,
  context?: Record<string, unknown>,
): AppError {
  return new AppError(
    `Invalid field '${fieldName}': ${reason}`,
    400,
    'VALIDATION_INVALID_FIELD',
    true,
    { field: fieldName, reason, ...context },
  );
}

// Token Generation Errors (TOKEN_*)
export function createTokenGenerationError(
  message: string = 'Failed to generate token',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 500, 'TOKEN_GENERATION_FAILED', true, context);
}

export function createDeepgramTokenError(
  message: string = 'Failed to generate Deepgram token',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 500, 'TOKEN_DEEPGRAM_FAILED', true, context);
}

// Prompt Errors (PROMPT_*)
export function createPromptLoadError(
  message: string = 'Failed to load AI assistant prompt',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 500, 'PROMPT_LOAD_FAILED', true, context);
}

export function createPromptNotFoundError(
  message: string = 'AI assistant prompt not found',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 404, 'PROMPT_NOT_FOUND', true, context);
}

// Rate Limiting Errors (RATE_LIMIT_*)
export function createRateLimitError(
  message: string = 'Too many requests, please try again later',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 429, 'RATE_LIMIT_EXCEEDED', true, context);
}

// Resource Errors (RESOURCE_*)
export function createNotFoundError(
  resourceType: string,
  resourceId?: string,
  context?: Record<string, unknown>,
): AppError {
  const message = resourceId
    ? `${resourceType} with ID '${resourceId}' not found`
    : `${resourceType} not found`;

  return new AppError(
    message,
    404,
    'RESOURCE_NOT_FOUND',
    true,
    { resourceType, resourceId, ...context },
  );
}

// Configuration Errors (CONFIG_*)
export function createConfigurationError(
  message: string,
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 500, 'CONFIG_INVALID', false, context);
}

export function createMissingEnvironmentVariableError(
  variableName: string,
  context?: Record<string, unknown>,
): AppError {
  return new AppError(
    `Missing required environment variable: ${variableName}`,
    500,
    'CONFIG_MISSING_ENV_VAR',
    false,
    { variable: variableName, ...context },
  );
}

// Service Errors (SERVICE_*)
export function createServiceUnavailableError(
  serviceName: string,
  context?: Record<string, unknown>,
): AppError {
  return new AppError(
    `Service '${serviceName}' is currently unavailable`,
    503,
    'SERVICE_UNAVAILABLE',
    true,
    { service: serviceName, ...context },
  );
}

export function createExternalServiceError(
  serviceName: string,
  message: string,
  context?: Record<string, unknown>,
): AppError {
  return new AppError(
    `External service error (${serviceName}): ${message}`,
    502,
    'SERVICE_EXTERNAL_ERROR',
    true,
    { service: serviceName, ...context },
  );
}

// Internal Errors (INTERNAL_*)
export function createInternalError(
  message: string = 'An internal server error occurred',
  context?: Record<string, unknown>,
): AppError {
  return new AppError(message, 500, 'INTERNAL_ERROR', false, context);
}

// Error code reference for documentation
export const ERROR_CODES = {
  // Authentication (401, 403)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Validation (400)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FIELD: 'VALIDATION_INVALID_FIELD',

  // Token Generation (500)
  TOKEN_GENERATION_FAILED: 'TOKEN_GENERATION_FAILED',
  TOKEN_DEEPGRAM_FAILED: 'TOKEN_DEEPGRAM_FAILED',

  // Prompts (404, 500)
  PROMPT_LOAD_FAILED: 'PROMPT_LOAD_FAILED',
  PROMPT_NOT_FOUND: 'PROMPT_NOT_FOUND',

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Resources (404)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',

  // Configuration (500)
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING_ENV_VAR: 'CONFIG_MISSING_ENV_VAR',

  // Services (502, 503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SERVICE_EXTERNAL_ERROR: 'SERVICE_EXTERNAL_ERROR',

  // Internal (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
