import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { correlationIdMiddleware } from './correlationId';

describe('correlationId Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockSetHeader: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetHeader = vi.fn();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: mockSetHeader,
    };

    mockNext = vi.fn();
  });

  describe('correlation ID generation', () => {
    it('should generate a new correlation ID when no header is present', () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Should have generated and attached a correlation ID
      expect(mockRequest.correlationId).toBeDefined();
      expect(typeof mockRequest.correlationId).toBe('string');
      expect(mockRequest.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate different IDs for different requests', () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );
      const firstId = mockRequest.correlationId;

      // Reset request
      mockRequest = { headers: {} };
      mockResponse = { setHeader: vi.fn() };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );
      const secondId = mockRequest.correlationId;

      expect(firstId).not.toBe(secondId);
    });
  });

  describe('correlation ID extraction from headers', () => {
    it('should use existing X-Correlation-ID header', () => {
      const existingId = 'test-correlation-id-123';
      mockRequest.headers = {
        'x-correlation-id': existingId,
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBe(existingId);
    });

    it('should use existing X-Request-ID header', () => {
      const existingId = 'test-request-id-456';
      mockRequest.headers = {
        'x-request-id': existingId,
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBe(existingId);
    });

    it('should prioritize X-Correlation-ID over X-Request-ID', () => {
      const correlationId = 'correlation-123';
      const requestId = 'request-456';

      mockRequest.headers = {
        'x-correlation-id': correlationId,
        'x-request-id': requestId,
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBe(correlationId);
    });

    it('should handle array values in headers by using first value', () => {
      mockRequest.headers = {
        'x-correlation-id': ['first-id', 'second-id'],
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Should generate a new ID if header is an array (not a string)
      expect(mockRequest.correlationId).toBeDefined();
      expect(typeof mockRequest.correlationId).toBe('string');
      expect(mockRequest.correlationId).toMatch(/^[0-9a-f]{8}-/);
    });
  });

  describe('response headers', () => {
    it('should set X-Correlation-ID in response headers', () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockSetHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        mockRequest.correlationId,
      );
    });

    it('should set response header with existing correlation ID', () => {
      const existingId = 'existing-correlation-id';
      mockRequest.headers = {
        'x-correlation-id': existingId,
      };

      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockSetHeader).toHaveBeenCalledWith('X-Correlation-ID', existingId);
    });
  });

  describe('middleware flow', () => {
    it('should call next() to continue the middleware chain', () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should not throw errors on missing headers object', () => {
      mockRequest.headers = undefined as unknown as typeof mockRequest.headers;

      expect(() => {
        correlationIdMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );
      }).not.toThrow();

      expect(mockRequest.correlationId).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('UUID format validation', () => {
    it('should generate valid UUID v4 format', () => {
      correlationIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(mockRequest.correlationId).toMatch(uuidV4Regex);
    });
  });
});
