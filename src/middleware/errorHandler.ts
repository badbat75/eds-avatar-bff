import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';
import { logError, LOG_CONTEXTS } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log error for debugging
  logError(LOG_CONTEXTS.ERROR, 'Request error', error, {
    statusCode,
    url: req.url,
    method: req.method,
  });

  // Map status codes to error names
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  };

  const errorName = errorNames[statusCode] || (statusCode >= 500 ? 'Internal Server Error' : statusCode >= 400 ? 'Client Error' : 'Error');

  const apiError: ApiError = {
    error: errorName,
    message,
    statusCode,
  };

  res.status(statusCode).json(apiError);
}

export function notFoundHandler(req: Request, res: Response): void {
  const apiError: ApiError = {
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
  };

  res.status(404).json(apiError);
}