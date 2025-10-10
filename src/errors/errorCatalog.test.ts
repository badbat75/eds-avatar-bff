import { describe, it, expect } from 'vitest';
import {
  AppError,
  createAuthenticationError,
  createInvalidTokenError,
  createTokenExpiredError,
  createMissingTokenError,
  createInsufficientPermissionsError,
  createValidationError,
  createMissingFieldError,
  createInvalidFieldError,
  createTokenGenerationError,
  createDeepgramTokenError,
  createPromptLoadError,
  createPromptNotFoundError,
  createRateLimitError,
  createNotFoundError,
  createConfigurationError,
  createMissingEnvironmentVariableError,
  createServiceUnavailableError,
  createExternalServiceError,
  createInternalError,
  ERROR_CODES,
} from './errorCatalog';

describe('Error Catalog', () => {
  describe('Authentication Errors', () => {
    it('should create authentication error', () => {
      const error = createAuthenticationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ERROR_CODES.AUTH_REQUIRED);
      expect(error.message).toBe('Authentication required');
      expect(error.isOperational).toBe(true);
    });

    it('should create invalid token error', () => {
      const error = createInvalidTokenError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ERROR_CODES.AUTH_INVALID_TOKEN);
      expect(error.message).toBe('Invalid authentication token');
    });

    it('should create token expired error', () => {
      const error = createTokenExpiredError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ERROR_CODES.AUTH_TOKEN_EXPIRED);
      expect(error.message).toBe('Authentication token has expired');
    });

    it('should create missing token error', () => {
      const error = createMissingTokenError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ERROR_CODES.AUTH_TOKEN_MISSING);
      expect(error.message).toBe('No authentication token provided');
    });

    it('should create insufficient permissions error', () => {
      const error = createInsufficientPermissionsError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
      expect(error.message).toBe('Insufficient permissions to access this resource');
    });

    it('should accept custom message and context', () => {
      const context = { userId: '123' };
      const error = createInvalidTokenError('Custom token error', context);

      expect(error.message).toBe('Custom token error');
      expect(error.context).toEqual(context);
    });
  });

  describe('Validation Errors', () => {
    it('should create validation error', () => {
      const error = createValidationError('Validation failed');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
      expect(error.message).toBe('Validation failed');
    });

    it('should create missing field error', () => {
      const error = createMissingFieldError('email');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_MISSING_FIELD);
      expect(error.message).toBe("Required field 'email' is missing");
      expect(error.context).toHaveProperty('field', 'email');
    });

    it('should create invalid field error', () => {
      const error = createInvalidFieldError('age', 'must be a positive number');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_INVALID_FIELD);
      expect(error.message).toBe("Invalid field 'age': must be a positive number");
      expect(error.context).toHaveProperty('field', 'age');
      expect(error.context).toHaveProperty('reason', 'must be a positive number');
    });

    it('should merge additional context', () => {
      const error = createMissingFieldError('username', { source: 'registration form' });

      expect(error.context).toHaveProperty('field', 'username');
      expect(error.context).toHaveProperty('source', 'registration form');
    });
  });

  describe('Token Generation Errors', () => {
    it('should create token generation error', () => {
      const error = createTokenGenerationError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ERROR_CODES.TOKEN_GENERATION_FAILED);
      expect(error.message).toBe('Failed to generate token');
    });

    it('should create Deepgram token error', () => {
      const error = createDeepgramTokenError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ERROR_CODES.TOKEN_DEEPGRAM_FAILED);
      expect(error.message).toBe('Failed to generate Deepgram token');
    });

    it('should include context for token errors', () => {
      const context = { userId: '123', sessionId: 'abc' };
      const error = createDeepgramTokenError('Token creation failed', context);

      expect(error.context).toEqual(context);
    });
  });

  describe('Prompt Errors', () => {
    it('should create prompt load error', () => {
      const error = createPromptLoadError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ERROR_CODES.PROMPT_LOAD_FAILED);
      expect(error.message).toBe('Failed to load AI assistant prompt');
    });

    it('should create prompt not found error', () => {
      const error = createPromptNotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ERROR_CODES.PROMPT_NOT_FOUND);
      expect(error.message).toBe('AI assistant prompt not found');
    });
  });

  describe('Rate Limiting Errors', () => {
    it('should create rate limit error', () => {
      const error = createRateLimitError();

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(error.message).toBe('Too many requests, please try again later');
    });
  });

  describe('Resource Errors', () => {
    it('should create not found error with resource type', () => {
      const error = createNotFoundError('User');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
      expect(error.message).toBe('User not found');
      expect(error.context).toHaveProperty('resourceType', 'User');
    });

    it('should create not found error with resource ID', () => {
      const error = createNotFoundError('User', '123');

      expect(error.message).toBe("User with ID '123' not found");
      expect(error.context).toHaveProperty('resourceType', 'User');
      expect(error.context).toHaveProperty('resourceId', '123');
    });
  });

  describe('Configuration Errors', () => {
    it('should create configuration error', () => {
      const error = createConfigurationError('Invalid database URL');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ERROR_CODES.CONFIG_INVALID);
      expect(error.message).toBe('Invalid database URL');
      expect(error.isOperational).toBe(false);
    });

    it('should create missing environment variable error', () => {
      const error = createMissingEnvironmentVariableError('DATABASE_URL');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ERROR_CODES.CONFIG_MISSING_ENV_VAR);
      expect(error.message).toBe('Missing required environment variable: DATABASE_URL');
      expect(error.context).toHaveProperty('variable', 'DATABASE_URL');
      expect(error.isOperational).toBe(false);
    });
  });

  describe('Service Errors', () => {
    it('should create service unavailable error', () => {
      const error = createServiceUnavailableError('Database');

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(error.message).toBe("Service 'Database' is currently unavailable");
      expect(error.context).toHaveProperty('service', 'Database');
    });

    it('should create external service error', () => {
      const error = createExternalServiceError('Deepgram', 'Connection timeout');

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe(ERROR_CODES.SERVICE_EXTERNAL_ERROR);
      expect(error.message).toBe('External service error (Deepgram): Connection timeout');
      expect(error.context).toHaveProperty('service', 'Deepgram');
    });
  });

  describe('Internal Errors', () => {
    it('should create internal error', () => {
      const error = createInternalError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.message).toBe('An internal server error occurred');
      expect(error.isOperational).toBe(false);
    });

    it('should accept custom message', () => {
      const error = createInternalError('Unexpected database error');

      expect(error.message).toBe('Unexpected database error');
    });
  });

  describe('ERROR_CODES constant', () => {
    it('should contain all error codes', () => {
      expect(ERROR_CODES).toHaveProperty('AUTH_REQUIRED');
      expect(ERROR_CODES).toHaveProperty('AUTH_INVALID_TOKEN');
      expect(ERROR_CODES).toHaveProperty('AUTH_TOKEN_EXPIRED');
      expect(ERROR_CODES).toHaveProperty('AUTH_TOKEN_MISSING');
      expect(ERROR_CODES).toHaveProperty('AUTH_INSUFFICIENT_PERMISSIONS');
      expect(ERROR_CODES).toHaveProperty('VALIDATION_FAILED');
      expect(ERROR_CODES).toHaveProperty('VALIDATION_MISSING_FIELD');
      expect(ERROR_CODES).toHaveProperty('VALIDATION_INVALID_FIELD');
      expect(ERROR_CODES).toHaveProperty('TOKEN_GENERATION_FAILED');
      expect(ERROR_CODES).toHaveProperty('TOKEN_DEEPGRAM_FAILED');
      expect(ERROR_CODES).toHaveProperty('PROMPT_LOAD_FAILED');
      expect(ERROR_CODES).toHaveProperty('PROMPT_NOT_FOUND');
      expect(ERROR_CODES).toHaveProperty('RATE_LIMIT_EXCEEDED');
      expect(ERROR_CODES).toHaveProperty('RESOURCE_NOT_FOUND');
      expect(ERROR_CODES).toHaveProperty('ROUTE_NOT_FOUND');
      expect(ERROR_CODES).toHaveProperty('CONFIG_INVALID');
      expect(ERROR_CODES).toHaveProperty('CONFIG_MISSING_ENV_VAR');
      expect(ERROR_CODES).toHaveProperty('SERVICE_UNAVAILABLE');
      expect(ERROR_CODES).toHaveProperty('SERVICE_EXTERNAL_ERROR');
      expect(ERROR_CODES).toHaveProperty('INTERNAL_ERROR');
    });
  });
});
