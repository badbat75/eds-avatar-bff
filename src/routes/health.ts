import { Router, Request, Response } from 'express';
import { config } from '../config/environment';
import { deepgramTokenService } from '../utils/deepgram';

const router = Router();

// GET /api/health - Comprehensive health check endpoint with all checks
router.get('/', (req: Request, res: Response) => {
  void (async () => {
    try {
      // Basic system info
      const timestamp = new Date().toISOString();
      const uptime = process.uptime();
      const memory = process.memoryUsage();

      // Check configuration
      const hasRequiredConfig = !!(config.deepgramApiKey && config.jwtSecret);

      // Check Deepgram API connectivity
      let deepgramConnected = false;
      if (hasRequiredConfig) {
        try {
          const testToken = await deepgramTokenService.generateAccessToken();
          deepgramConnected = !!testToken.token;
        } catch (error) {
          deepgramConnected = false;
        }
      }

      // Determine overall status
      const allChecksPass = hasRequiredConfig && deepgramConnected;
      const status = allChecksPass ? 'healthy' : 'degraded';
      const httpStatus = allChecksPass ? 200 : 503;

      res.status(httpStatus).json({
        status,
        timestamp,
        service: 'eds-avatar-bff',
        version: '1.0.0',
        environment: config.nodeEnv,
        uptime,
        memory,
        checks: {
          config: hasRequiredConfig,
          deepgram: deepgramConnected,
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'eds-avatar-bff',
        version: '1.0.0',
        message: 'Health check failed',
      });
    }
  })();
});

export default router;