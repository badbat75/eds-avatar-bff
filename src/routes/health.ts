import { Router, Request, Response } from 'express';
import { config } from '../config/environment';

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

// GET /api/health/ready - Readiness probe
router.get('/ready', (req: Request, res: Response) => {
  // Check if all required services are available
  const isReady = config.deepgramApiKey && config.jwtSecret;

  if (!isReady) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      message: 'Required configuration missing',
    });
    return;
  }

  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

export default router;