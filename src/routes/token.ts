import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { deepgramTokenService } from '../utils/deepgram';
import { DeepgramTokenRequest, DeepgramTokenResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logInfo, LOG_CONTEXTS } from '../utils/logger';

const router = Router();

// POST /api/token/deepgram - Generate a new Deepgram token
router.post('/deepgram', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const { sessionId } = req.body as Partial<DeepgramTokenRequest>;
      const userId = req.user?.sub;

      if (!userId) {
        throw new AppError('User ID not found in token', 400);
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

// GET /api/token/validate - Validate current JWT token
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