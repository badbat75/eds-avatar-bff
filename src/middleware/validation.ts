import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler';
import { logWarn, LOG_CONTEXTS } from '../utils/logger';

/**
 * Validation target enum
 */
export enum ValidationTarget {
  BODY = 'body',
  QUERY = 'query',
  PARAMS = 'params',
}

/**
 * Generic validation middleware factory
 * Creates Express middleware that validates request data against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (body, query, params)
 * @returns Express middleware function
 *
 * @example
 * router.post('/api/users', validate(userSchema, ValidationTarget.BODY), handler);
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = ValidationTarget.BODY,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get the data to validate based on target
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const dataToValidate = req[target];

      // Validate the data against the schema
      const validatedData = schema.parse(dataToValidate);

      // Replace the request data with validated data (ensures type safety)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      req[target] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors into user-friendly messages
        const errorMessages = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        // Log validation failure
        logWarn(LOG_CONTEXTS.API, 'Request validation failed', {
          target,
          errors: errorMessages,
          path: req.path,
        });

        // Return 400 Bad Request with detailed error information
        const validationError = new AppError(
          `Validation failed: ${errorMessages.map(e => `${e.field} - ${e.message}`).join(', ')}`,
          400,
        );

        next(validationError);
      } else {
        // Unexpected error during validation
        next(error);
      }
    }
  };
}

/**
 * Convenience function for body validation
 */
export const validateBody = (schema: ZodSchema) => validate(schema, ValidationTarget.BODY);

/**
 * Convenience function for query validation
 */
export const validateQuery = (schema: ZodSchema) => validate(schema, ValidationTarget.QUERY);

/**
 * Convenience function for params validation
 */
export const validateParams = (schema: ZodSchema) => validate(schema, ValidationTarget.PARAMS);
