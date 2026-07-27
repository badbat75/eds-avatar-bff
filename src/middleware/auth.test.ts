import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from './auth';

/**
 * The bb-auth gate is the only authentication: nginx runs an `auth_request`, then
 * overwrites the identity header on every request it forwards. These tests cover what
 * the middleware may conclude from that header — and, just as importantly, that a
 * bearer token means nothing to it.
 */
describe('authenticateToken middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: Mock;
  let mockStatus: Mock;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockRequest = { headers: {} };
    mockResponse = { status: mockStatus, json: mockJson };
    mockNext = vi.fn();

    vi.clearAllMocks();
  });

  it('should accept the identity header the gate set', () => {
    mockRequest.headers = { 'x-auth-email': 'user@example.com' };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockRequest.user).toEqual({
      sub: 'user@example.com',
      email: 'user@example.com',
      iss: 'bb-auth-gate',
    });
  });

  it('should trim surrounding whitespace from the identity', () => {
    mockRequest.headers = { 'x-auth-email': '  user@example.com  ' };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.user?.email).toBe('user@example.com');
  });

  it('should return 401 when the gate forwarded no identity', () => {
    mockRequest.headers = {};

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Missing x-auth-email identity header',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when the identity header is blank', () => {
    mockRequest.headers = { 'x-auth-email': '   ' };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should take the first value when the header arrives repeated', () => {
    mockRequest.headers = { 'x-auth-email': ['first@example.com', 'second@example.com'] };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.user?.email).toBe('first@example.com');
  });

  it('should ignore a bearer token: the proxy is the authentication', () => {
    mockRequest.headers = {
      authorization: 'Bearer some.jwt.token',
      'x-auth-email': 'user@example.com',
    };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.user?.email).toBe('user@example.com');
  });

  it('should reject a bearer token when the gate forwarded no identity', () => {
    mockRequest.headers = { authorization: 'Bearer some.jwt.token' };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  describe('names forwarded by the gate', () => {
    it('should percent-decode the names', () => {
      mockRequest.headers = {
        'x-auth-email': 'user@example.com',
        'x-auth-given-name': 'Emiliano',
        'x-auth-family-name': 'De%20Simoni',
      };

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user?.givenName).toBe('Emiliano');
      expect(mockRequest.user?.familyName).toBe('De Simoni');
    });

    it('should decode non-ASCII names', () => {
      mockRequest.headers = {
        'x-auth-email': 'user@example.com',
        'x-auth-given-name': 'Nicol%C3%B2',
      };

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user?.givenName).toBe('Nicolò');
    });

    it('should leave the names undefined when the gate sent none', () => {
      mockRequest.headers = { 'x-auth-email': 'user@example.com' };

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user?.givenName).toBeUndefined();
      expect(mockRequest.user?.familyName).toBeUndefined();
    });

    it('should keep the request authenticated when a name cannot be decoded', () => {
      // A lone '%' throws in decodeURIComponent. The email is the credential, so a
      // broken cosmetic field must not turn an authorized caller into a 401.
      mockRequest.headers = {
        'x-auth-email': 'user@example.com',
        'x-auth-given-name': '100%',
      };

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockRequest.user?.givenName).toBe('100%');
    });

    it('should not let names stand in for a missing identity', () => {
      mockRequest.headers = {
        'x-auth-given-name': 'Emiliano',
        'x-auth-family-name': 'De%20Simoni',
      };

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
