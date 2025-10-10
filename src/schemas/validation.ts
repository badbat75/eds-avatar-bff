import { z } from 'zod';

/**
 * Zod schema for Deepgram token request
 * POST /api/token/deepgram body validation
 */
export const deepgramTokenRequestSchema = z.object({
  sessionId: z.string().optional().refine(
    (val) => !val || val.length <= 100,
    { message: 'sessionId must be 100 characters or less' },
  ),
});

/**
 * Type inference from schema
 */
export type DeepgramTokenRequestBody = z.infer<typeof deepgramTokenRequestSchema>;

/**
 * Export all schemas for easy access
 */
export const schemas = {
  deepgramTokenRequest: deepgramTokenRequestSchema,
} as const;
