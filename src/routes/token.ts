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
 *         description: Unauthorized - Missing gate identity header
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
        throw createMissingFieldError('userId', { source: 'gate identity header' });
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
 *     summary: Return the caller's identity
 *     description: Reports the identity the bb-auth gate established for this request
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
 *       401:
 *         description: Unauthorized - Missing gate identity header
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/validate', authenticateToken, (req: Request, res: Response) => {
  // No expiry is reported: the session lives in a cookie this service never sees.
  // The names are optional - the gate only has them when the id token did - so the
  // composed display name is omitted rather than sent empty, leaving the client free
  // to fall back to whatever it prefers.
  const displayName = [req.user?.givenName, req.user?.familyName].filter(Boolean).join(' ');

  res.json({
    valid: true,
    user: {
      id: req.user?.sub,
      email: req.user?.email,
      givenName: req.user?.givenName,
      familyName: req.user?.familyName,
      name: displayName || undefined,
    },
  });
});

export default router;