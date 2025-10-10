import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, AppError, notFoundHandler } from './errorHandler';

// Mock logger
vi.mock('../utils/logger', () => ({
  logError: vi.fn(),
  LOG_CONTEXTS: {
    ERROR: 'error',
  },
}));

describe('errorHandler middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: Mock;
  let mockStatus: Mock;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      url: '/api/test',
      method: 'GET',
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = vi.fn();

    vi.clearAllMocks();
  });

  describe('AppError', () => {
    it('should create AppError with statusCode, code, and isOperational', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should set isOperational to false when specified', () => {
      const error = new AppError('System error', 500, 'SYSTEM_ERROR', false);

      expect(error.isOperational).toBe(false);
    });

    it('should store context metadata', () => {
      const context = { userId: '123', action: 'test' };
      const error = new AppError('Test error', 400, 'TEST_ERROR', true, context);

      expect(error.context).toEqual(context);
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Custom error message', 404, 'CUSTOM_NOT_FOUND');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Custom error message',
        statusCode: 404,
        code: 'CUSTOM_NOT_FOUND',
      });
    });

    it('should handle generic Error with 500 status', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Internal server error',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle JsonWebTokenError with 401 status', () => {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
        statusCode: 401,
        code: 'AUTH_INVALID_TOKEN',
      });
    });

    it('should handle TokenExpiredError with 401 status', () => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Token expired',
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
      });
    });

    it('should handle 400 Bad Request errors', () => {
      const error = new AppError('Invalid input', 400, 'INVALID_INPUT');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid input',
        statusCode: 400,
        code: 'INVALID_INPUT',
      });
    });

    it('should handle 401 Unauthorized errors', () => {
      const error = new AppError('Not authenticated', 401, 'AUTH_REQUIRED');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Not authenticated',
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    });

    it('should handle 403 Forbidden errors', () => {
      const error = new AppError('Access denied', 403, 'ACCESS_DENIED');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Access denied',
        statusCode: 403,
        code: 'ACCESS_DENIED',
      });
    });

    it('should handle 429 Too Many Requests errors', () => {
      const error = new AppError('Rate limit exceeded', 429, 'RATE_LIMIT');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        statusCode: 429,
        code: 'RATE_LIMIT',
      });
    });

    it('should use default message for unknown status codes', () => {
      const error = new AppError('Custom message', 418, 'TEAPOT'); // I'm a teapot

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(418);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Client Error', // 418 is in 4xx range
        message: 'Custom message',
        statusCode: 418,
        code: 'TEAPOT',
      });
    });

    it('should include context metadata in response when provided', () => {
      const context = { userId: '123', attemptedAction: 'delete' };
      const error = new AppError('Access denied', 403, 'ACCESS_DENIED', true, context);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Access denied',
        statusCode: 403,
        code: 'ACCESS_DENIED',
        context,
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 for non-existent routes', () => {
      mockRequest.url = '/api/non-existent';
      mockRequest.method = 'GET';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Route GET /api/non-existent not found',
        statusCode: 404,
        code: 'ROUTE_NOT_FOUND',
      });
    });

    it('should include request path in response', () => {
      mockRequest.url = '/api/unknown-endpoint';
      mockRequest.method = 'POST';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('/api/unknown-endpoint'),
          code: 'ROUTE_NOT_FOUND',
        }),
      );
    });
  });
});
