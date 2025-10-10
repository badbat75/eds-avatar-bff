import { describe, it, expect, beforeAll, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import healthRoutes, { resetHealthCache } from './health';
import { config } from '../config/environment';
import { deepgramTokenService } from '../utils/deepgram';

// Mock deepgram service
vi.mock('../utils/deepgram', () => ({
  deepgramTokenService: {
    checkConnectivity: vi.fn(),
  },
}));

describe('Health Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use('/api/health', healthRoutes);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetHealthCache(); // Reset cache before each test
    // Default mock: Deepgram is accessible
    vi.mocked(deepgramTokenService.checkConnectivity).mockResolvedValue(true);
  });

  afterEach(() => {
    resetHealthCache(); // Clean up after each test
  });

  describe('GET /api/health', () => {
    it('should return 200 with healthy status when all checks pass', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'eds-avatar-bff');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toEqual({
        config: true,
        deepgram: true,
      });
      expect(deepgramTokenService.checkConnectivity).toHaveBeenCalled();
    });

    it('should return valid timestamp', async () => {
      const response = await request(app).get('/api/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should return process uptime as a number', async () => {
      const response = await request(app).get('/api/health');

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return memory usage information', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('external');
    });

    it('should return 503 with degraded status when config is missing', async () => {
      const spy = vi.spyOn(config, 'deepgramApiKey', 'get').mockReturnValue('');

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.checks).toEqual({
        config: false,
        deepgram: false,
      });
      // Should not call Deepgram when config is missing
      expect(deepgramTokenService.checkConnectivity).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should return 503 with degraded status when Deepgram is unreachable', async () => {
      vi.mocked(deepgramTokenService.checkConnectivity).mockResolvedValue(false);

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.checks).toEqual({
        config: true,
        deepgram: false,
      });
    });

    it('should cache Deepgram connectivity check for 1 minute', async () => {
      // First request - should call Deepgram
      const response1 = await request(app).get('/api/health');
      expect(response1.status).toBe(200);
      expect(deepgramTokenService.checkConnectivity).toHaveBeenCalledTimes(1);

      // Second request within cache window - should use cached value
      const response2 = await request(app).get('/api/health');
      expect(response2.status).toBe(200);
      expect(response2.body.checks.deepgram).toBe(true);
      // Should still be 1 call (cached)
      expect(deepgramTokenService.checkConnectivity).toHaveBeenCalledTimes(1);

      // Third request - should still use cache
      const response3 = await request(app).get('/api/health');
      expect(response3.status).toBe(200);
      expect(deepgramTokenService.checkConnectivity).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      // Use fake timers to control time
      vi.useFakeTimers();

      // First request
      const promise1 = request(app).get('/api/health');
      await vi.runAllTimersAsync();
      const response1 = await promise1;
      expect(response1.status).toBe(200);
      expect(deepgramTokenService.checkConnectivity).toHaveBeenCalledTimes(1);

      // Advance time by 61 seconds (past the 60-second cache TTL)
      vi.advanceTimersByTime(61 * 1000);

      // Second request after cache expiry - should call Deepgram again
      const promise2 = request(app).get('/api/health');
      await vi.runAllTimersAsync();
      const response2 = await promise2;
      expect(response2.status).toBe(200);
      expect(deepgramTokenService.checkConnectivity).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
