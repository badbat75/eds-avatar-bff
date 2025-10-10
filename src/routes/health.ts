import { Router, Request, Response } from 'express';
import { config } from '../config/environment';
import { deepgramTokenService } from '../utils/deepgram';

const router = Router();

// GET /api/health - Health check endpoint
router.get('/', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'eds-avatar-bff',
    version: '1.0.0',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  res.json(healthCheck);
});

// GET /api/health/ready - Readiness probe with Deepgram connectivity check
router.get('/ready', (req: Request, res: Response) => {
  void (async () => {
    try {
      // Check if all required configuration is present
      const hasRequiredConfig = config.deepgramApiKey && config.jwtSecret;

      if (!hasRequiredConfig) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          message: 'Required configuration missing',
          checks: {
            config: false,
          },
        });
        return;
      }

      // Check Deepgram API connectivity
      let deepgramConnected = false;
      try {
        // Use a lightweight token validation as connectivity check
        // This creates a minimal API call to verify Deepgram is reachable
        const testToken = await deepgramTokenService.generateAccessToken();
        deepgramConnected = !!testToken.token;
      } catch (error) {
        // Deepgram connectivity failed
        deepgramConnected = false;
      }

      if (!deepgramConnected) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          message: 'Deepgram API not reachable',
          checks: {
            config: true,
            deepgram: false,
          },
        });
        return;
      }

      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          config: true,
          deepgram: true,
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
      });
    }
  })();
});

// GET /api/health/live - Liveness probe (lightweight, no external dependencies)
router.get('/live', (req: Request, res: Response) => {
  // Simple liveness check - just confirms the process is running
  // No external service checks - always returns 200 if process is alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;