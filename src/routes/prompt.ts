import { Router, Request, Response, NextFunction } from 'express';
import { promptService } from '../services/promptService';
import { authenticateToken } from '../middleware/auth';
import { logError, LOG_CONTEXTS } from '../utils/logger';

const router = Router();

/**
 * GET /api/prompt/assistant
 * Get the current AI assistant prompt
 * Requires JWT authentication
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
 * GET /api/prompt/info
 * Get information about the prompt configuration
 * Requires JWT authentication
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