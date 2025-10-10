import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateBody, validateQuery, validateParams, ValidationTarget } from './validation';
import { AppError } from './errorHandler';

// Mock logger
vi.mock('../utils/logger', () => ({
  logWarn: vi.fn(),
  LOG_CONTEXTS: {
    API: 'api',
  },
}));

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
      path: '/api/test',
    };
    mockResponse = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('validate function', () => {
    it('should pass validation with valid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: 'John', age: 30 };

      const middleware = validate(schema, ValidationTarget.BODY);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRequest.body).toEqual({ name: 'John', age: 30 });
    });

    it('should fail validation with invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: 'John', age: 'not a number' };

      const middleware = validate(schema, ValidationTarget.BODY);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as Mock).mock.calls[0]?.[0];
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('Validation failed');
    });

    it('should validate query parameters', () => {
      const schema = z.object({
        page: z.string(),
        limit: z.string(),
      });

      mockRequest.query = { page: '1', limit: '10' };

      const middleware = validate(schema, ValidationTarget.QUERY);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: '1', limit: '10' });
    });

    it('should validate route params', () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validate(schema, ValidationTarget.PARAMS);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.params).toEqual({ id: '123e4567-e89b-12d3-a456-426614174000' });
    });

    it('should handle missing required fields', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      mockRequest.body = { name: 'John' }; // Missing email

      const middleware = validate(schema, ValidationTarget.BODY);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as Mock).mock.calls[0]?.[0];
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toContain('email');
    });

    it('should handle multiple validation errors', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().positive(),
        email: z.string().email(),
      });

      mockRequest.body = {
        name: 'Jo', // Too short
        age: -5, // Negative
        email: 'invalid', // Invalid email
      };

      const middleware = validate(schema, ValidationTarget.BODY);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as Mock).mock.calls[0]?.[0];
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });

      mockRequest.body = { name: 'John' }; // nickname is optional

      const middleware = validate(schema, ValidationTarget.BODY);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John' });
    });

    it('should strip unknown fields by default', () => {
      const schema = z.object({
        name: z.string(),
      });

      mockRequest.body = { name: 'John', unknownField: 'value' };

      const middleware = validate(schema, ValidationTarget.BODY);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'John' });
    });

    it('should handle unexpected errors', () => {
      const schema = z.object({
        name: z.string(),
      });

      // Mock schema.parse to throw unexpected error
      vi.spyOn(schema, 'parse').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockRequest.body = { name: 'John' };

      const middleware = validate(schema, ValidationTarget.BODY);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as Mock).mock.calls[0]?.[0];
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Unexpected error');
    });
  });

  describe('convenience functions', () => {
    it('validateBody should validate request body', () => {
      const schema = z.object({ name: z.string() });
      mockRequest.body = { name: 'Test' };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('validateQuery should validate query parameters', () => {
      const schema = z.object({ page: z.string() });
      mockRequest.query = { page: '1' };

      const middleware = validateQuery(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('validateParams should validate route params', () => {
      const schema = z.object({ id: z.string() });
      mockRequest.params = { id: '123' };

      const middleware = validateParams(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
