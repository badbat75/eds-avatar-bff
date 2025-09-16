import { Router, Request, Response, NextFunction } from 'express';
import { promptService } from '../services/promptService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/prompt/assistant
 * Get the current AI assistant prompt
 * Requires JWT authentication
 */
router.get('/assistant', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promptData = await promptService.getPrompt();

    res.json({
      success: true,
      data: promptData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    next(error);
  }
});

/**
 * GET /api/prompt/info
 * Get information about the prompt configuration
 * Requires JWT authentication
 */
router.get('/info', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
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
        message: 'Prompt can only be updated by editing the file directly on the server'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching prompt info:', error);
    next(error);
  }
});

export default router;