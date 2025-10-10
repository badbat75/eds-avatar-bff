import { Router, Request, Response } from 'express';
import { config } from '../config/environment';
import { deepgramTokenService } from '../utils/deepgram';

const router = Router();

/**
 * Cache for Deepgram connectivity check to prevent API overload
 * @interface DeepgramHealthCache
 */
interface DeepgramHealthCache {
  /** Whether Deepgram is connected */
  connected: boolean;
  /** Timestamp when cache was last updated (Unix milliseconds) */
  timestamp: number;
}

/** Cache duration in milliseconds (1 minute) */
const CACHE_TTL_MS = 60 * 1000;

/** Cached Deepgram health status */
let deepgramHealthCache: DeepgramHealthCache | null = null;

/**
 * Resets the Deepgram health check cache (primarily for testing)
 * @internal
 */
export function resetHealthCache(): void {
  deepgramHealthCache = null;
}

/**
 * Checks Deepgram connectivity with 1-minute caching to prevent API overload
 * @returns Promise resolving to connection status
 */
async function checkDeepgramConnectivity(): Promise<boolean> {
  const now = Date.now();

  // Return cached value if still valid
  if (deepgramHealthCache && (now - deepgramHealthCache.timestamp) < CACHE_TTL_MS) {
    return deepgramHealthCache.connected;
  }

  // Perform actual connectivity check
  let connected = false;
  try {
    const testToken = await deepgramTokenService.generateAccessToken();
    connected = !!testToken.token;
  } catch (error) {
    connected = false;
  }

  // Update cache
  deepgramHealthCache = {
    connected,
    timestamp: now,
  };

  return connected;
}

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

      // Check Deepgram API connectivity (with caching to prevent overload)
      let deepgramConnected = false;
      if (hasRequiredConfig) {
        deepgramConnected = await checkDeepgramConnectivity();
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