import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { deepgramTokenService } from '../utils/deepgram';
import { DeepgramTokenRequest, DeepgramTokenResponse } from '../types';
import { logInfo, LOG_CONTEXTS } from '../utils/logger';
import { deepgramTokenRequestSchema } from '../schemas/validation';
import { createMissingFieldError } from '../errors/errorCatalog';

const router = Router();

/**
 * @openapi
 * /api/token/deepgram:
 *   post:
 *     summary: Generate Deepgram token
 *     description: Generates a project-scoped Deepgram token with configurable TTL for authenticated users
 *     tags:
 *       - Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeepgramTokenRequest'
 *     responses:
 *       200:
 *         description: Deepgram token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeepgramTokenResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       400:
 *         description: Bad Request - Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Internal Server Error - Token generation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/deepgram', authenticateToken, validateBody(deepgramTokenRequestSchema), (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const { sessionId } = req.body as Partial<DeepgramTokenRequest>;
      const userId = req.user?.sub;

      if (!userId) {
        throw createMissingFieldError('userId', { source: 'JWT token' });
      }

      // Generate configurable TTL project token from Deepgram
      const tokenData = await deepgramTokenService.generateProjectToken(userId, sessionId);

      const response: DeepgramTokenResponse = {
        token: tokenData.token,
        expiresIn: tokenData.expiresIn,
        expiresAt: tokenData.expiresAt,
      };

      // Log successful token generation (without exposing the actual token)
      logInfo(LOG_CONTEXTS.TOKEN, 'Generated Deepgram token', {
        userId,
        sessionId,
        expiresAt: tokenData.expiresAt,
        expiresInMinutes: Math.floor(tokenData.expiresIn / 60),
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * @openapi
 * /api/token/validate:
 *   get:
 *     summary: Validate JWT token
 *     description: Validates the current JWT token and returns user information
 *     tags:
 *       - Token
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/validate', authenticateToken, (req: Request, res: Response) => {
  // If we reach here, the JWT token is valid
  res.json({
    valid: true,
    user: {
      id: req.user?.sub,
      email: req.user?.email,
      name: req.user?.name,
    },
    expiresAt: new Date(req.user!.exp * 1000).toISOString(),
  });
});

export default router;