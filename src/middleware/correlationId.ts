import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type to include correlationId
declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

/**
 * Correlation ID middleware
 * Generates or extracts a correlation ID for request tracing
 *
 * @description
 * - Checks for existing X-Correlation-ID or X-Request-ID header
 * - Generates a new UUID if no header is present
 * - Attaches correlationId to request object
 * - Adds X-Correlation-ID to response headers
 * - Enables end-to-end request tracing across services
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Check for existing correlation ID in headers (safely handle missing headers)
  const existingId =
    req.headers?.['x-correlation-id'] ||
    req.headers?.['x-request-id'];

  // Generate new UUID if no existing ID
  const correlationId = typeof existingId === 'string'
    ? existingId
    : randomUUID();

  // Attach to request object
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  next();
}
