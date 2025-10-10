import { Router, Request, Response, NextFunction } from 'express';
import { promptService } from '../services/promptService';
import { authenticateToken } from '../middleware/auth';
import { logError, LOG_CONTEXTS } from '../utils/logger';

const router = Router();

/**
 * @openapi
 * /api/prompt/assistant:
 *   get:
 *     summary: Get AI assistant prompt
 *     description: Returns the current AI assistant prompt content
 *     tags:
 *       - Prompt
 *     responses:
 *       200:
 *         description: Prompt retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     prompt:
 *                       type: string
 *                       description: The AI assistant prompt text
 *                     lastModified:
 *                       type: string
 *                       format: date-time
 *                     version:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/assistant', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const promptData = await promptService.getPrompt();

      res.json({
        success: true,
        data: promptData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logError(LOG_CONTEXTS.PROMPT, 'Error fetching prompt', error as Error);
      next(error);
    }
  })();
});

/**
 * @openapi
 * /api/prompt/info:
 *   get:
 *     summary: Get prompt metadata
 *     description: Returns metadata about the prompt configuration including file path and version
 *     tags:
 *       - Prompt
 *     responses:
 *       200:
 *         description: Prompt info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     filePath:
 *                       type: string
 *                     lastModified:
 *                       type: string
 *                       format: date-time
 *                     version:
 *                       type: string
 *                     promptLength:
 *                       type: number
 *                     message:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/info', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const promptPath = promptService.getPromptFilePath();
      const promptData = await promptService.getPrompt();

      res.json({
        success: true,
        data: {
          filePath: promptPath,
          lastModified: promptData.lastModified,
          version: promptData.version,
          promptLength: promptData.prompt.length,
          message: 'Prompt can only be updated by editing the file directly on the server',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logError(LOG_CONTEXTS.PROMPT, 'Error fetching prompt info', error as Error);
      next(error);
    }
  })();
});

export default router;