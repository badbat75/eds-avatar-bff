import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import healthRoutes from './health';
import { config } from '../config/environment';
import { deepgramTokenService } from '../utils/deepgram';

// Mock deepgram service
vi.mock('../utils/deepgram', () => ({
  deepgramTokenService: {
    generateAccessToken: vi.fn(),
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
    // Default mock: Deepgram is accessible
    vi.mocked(deepgramTokenService.generateAccessToken).mockResolvedValue({
      token: 'test-token',
      expiresIn: 30,
      expiresAt: new Date().toISOString(),
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 with health check data', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'eds-avatar-bff');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
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
  });

  describe('GET /api/health/ready', () => {
    it('should return 200 when service is ready and Deepgram is accessible', async () => {
      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toEqual({
        config: true,
        deepgram: true,
      });
      expect(deepgramTokenService.generateAccessToken).toHaveBeenCalled();
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app).get('/api/health/ready');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should return 503 when service is not ready (missing config)', async () => {
      // Spy on config to temporarily make it return empty string
      const spy = vi.spyOn(config, 'deepgramApiKey', 'get').mockReturnValue('');

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'not ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('message', 'Required configuration missing');
      expect(response.body.checks).toEqual({
        config: false,
      });

      // Restore spy
      spy.mockRestore();
    });

    it('should return 503 when Deepgram API is not reachable', async () => {
      // Mock Deepgram to fail
      vi.mocked(deepgramTokenService.generateAccessToken).mockRejectedValue(
        new Error('Deepgram API error'),
      );

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'not ready');
      expect(response.body).toHaveProperty('message', 'Deepgram API not reachable');
      expect(response.body.checks).toEqual({
        config: true,
        deepgram: false,
      });
    });
  });

  describe('GET /api/health/live', () => {
    it('should return 200 with liveness status', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app).get('/api/health/live');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should return uptime as a number', async () => {
      const response = await request(app).get('/api/health/live');

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should not check external dependencies', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
      // Should not call Deepgram service
      expect(deepgramTokenService.generateAccessToken).not.toHaveBeenCalled();
    });
  });
});
