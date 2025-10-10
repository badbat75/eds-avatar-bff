import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, generateToken } from './auth';
import jwt from 'jsonwebtoken';

import { createMockToken, createExpiredToken } from '../test/helpers';

// Mock jwks-rsa
vi.mock('jwks-rsa', () => ({
  default: vi.fn(() => ({
    getSigningKey: vi.fn(),
  })),
}));

describe('authenticateToken middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: Mock;
  let mockStatus: Mock;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = vi.fn();

    vi.clearAllMocks();
  });

  it('should return 401 if no authorization header is provided', () => {
    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Access token is required',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header is malformed', () => {
    mockRequest.headers = { authorization: 'InvalidFormat' };

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() with valid token', () => {
    const token = createMockToken();
    mockRequest.headers = { authorization: `Bearer ${token}` };

    // Mock jwt.verify to call callback with decoded payload
    vi.spyOn(jwt, 'verify').mockImplementation((_token, _secretOrPublicKey, _options, callback) => {
      const decoded = {
        sub: 'test-user-123',
        aud: process.env.JWT_AUDIENCE,
        iss: process.env.JWT_ISSUER,
      };
      (callback as any)(null, decoded);
      return undefined as any;
    });

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockRequest as any).user).toBeDefined();
    expect((mockRequest as any).user.sub).toBe('test-user-123');
  });

  it('should return 403 if token verification fails', () => {
    const token = 'invalid-token';
    mockRequest.headers = { authorization: `Bearer ${token}` };

    // Mock jwt.verify to call callback with error
    vi.spyOn(jwt, 'verify').mockImplementation((_token, _secretOrPublicKey, _options, callback) => {
      (callback as any)(new Error('Invalid token'));
      return undefined as any;
    });

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: expect.stringContaining('Token validation failed'),
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if token payload is missing sub', () => {
    const token = createMockToken();
    mockRequest.headers = { authorization: `Bearer ${token}` };

    // Mock jwt.verify to return payload without sub
    vi.spyOn(jwt, 'verify').mockImplementation((_token, _secretOrPublicKey, _options, callback) => {
      const decoded = {
        aud: process.env.JWT_AUDIENCE,
        iss: process.env.JWT_ISSUER,
      };
      (callback as any)(null, decoded);
      return undefined as any;
    });

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Token validation failed: Invalid token payload - missing subject',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle expired token', () => {
    const token = createExpiredToken();
    mockRequest.headers = { authorization: `Bearer ${token}` };

    // Mock jwt.verify to call callback with expiration error
    vi.spyOn(jwt, 'verify').mockImplementation((_token, _secretOrPublicKey, _options, callback) => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      (callback as any)(error);
      return undefined as any;
    });

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: expect.stringContaining('jwt expired'),
    });
  });

  it('should attach user to request object on success', () => {
    const token = createMockToken({ email: 'test@example.com', name: 'Test User' });
    mockRequest.headers = { authorization: `Bearer ${token}` };

    vi.spyOn(jwt, 'verify').mockImplementation((_token, _secretOrPublicKey, _options, callback) => {
      const decoded = {
        sub: 'test-user-123',
        aud: process.env.JWT_AUDIENCE,
        iss: process.env.JWT_ISSUER,
        email: 'test@example.com',
        name: 'Test User',
      };
      (callback as any)(null, decoded);
      return undefined as any;
    });

    authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).user).toEqual({
      sub: 'test-user-123',
      aud: process.env.JWT_AUDIENCE,
      iss: process.env.JWT_ISSUER,
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('generateToken function', () => {
  beforeEach(() => {
    // Mock jwt.sign to avoid RS256 key requirements in tests
    vi.spyOn(jwt, 'sign').mockImplementation((payload: any) => {
      // Return a mock token that looks like a JWT
      return 'mock.' + Buffer.from(JSON.stringify(payload)).toString('base64') + '.signature';
    });
  });

  it('should call jwt.sign and return token', () => {
    const payload = {
      sub: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const token = generateToken(payload);

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(jwt.sign).toHaveBeenCalled();
  });

  it('should generate token with 15 minute expiration', () => {
    const payload = {
      sub: 'test-user-123',
      email: 'test@example.com',
    };

    generateToken(payload);

    const callArgs = (jwt.sign as any).mock.calls[0][0];
    expect(callArgs.exp - callArgs.iat).toBe(15 * 60); // 15 minutes in seconds
  });

  it('should include required JWT fields', () => {
    const payload = {
      sub: 'test-user-123',
      email: 'test@example.com',
    };

    generateToken(payload);

    const callArgs = (jwt.sign as any).mock.calls[0][0];
    expect(callArgs).toHaveProperty('sub');
    expect(callArgs).toHaveProperty('email');
    expect(callArgs).toHaveProperty('iat');
    expect(callArgs).toHaveProperty('exp');
    expect(callArgs).toHaveProperty('iss');
    expect(callArgs).toHaveProperty('aud');
  });
});
