import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/environment';
import { JwtPayload } from '../types';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

// Initialize JWKS client for Auth0 public key retrieval
const client = jwksClient({
  jwksUri: `https://${config.jwtIssuer.replace(/\/$/, '').replace('https://', '')}/.well-known/jwks.json`,
  requestHeaders: {},
  timeout: config.jwksRequestTimeoutMs,
  cache: true,
  cacheMaxEntries: config.jwksCacheMaxEntries,
  cacheMaxAge: config.jwksCacheMaxAgeMs,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

// Function to get the signing key
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  if (!header.kid) {
    return callback(new Error('Missing kid in token header'));
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is required',
    });
    return;
  }

  // Verify token with configurable algorithms
  jwt.verify(token, getKey, {
    audience: config.jwtAudience,
    issuer: config.jwtIssuer,
    algorithms: config.jwtVerifyAlgorithms as jwt.Algorithm[],
  }, (err, decoded) => {
    if (err) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Token validation failed: ${err.message}`,
      });
      return;
    }

    const payload = decoded as JwtPayload;

    // Validate token structure
    if (!payload.sub) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Token validation failed: Invalid token payload - missing subject',
      });
      return;
    }

    req.user = payload;
    next();
  });

  // Function returns here after initiating async verification
  return;
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + (15 * 60), // 15 minutes
    iss: config.jwtIssuer,
    aud: config.jwtAudience,
  };

  return jwt.sign(tokenPayload, config.jwtSecret, {
    algorithm: config.jwtAlgorithm as jwt.Algorithm,
  });
}