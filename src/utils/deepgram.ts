/**
 * Deepgram token management service
 * @module utils/deepgram
 */

import { createClient } from '@deepgram/sdk';
import { config } from '../config/environment';
import { logError, LOG_CONTEXTS } from './logger';
import {
  createDeepgramTokenError,
  createExternalServiceError,
  createRateLimitError,
  createConfigurationError,
  AppError,
} from '../errors/errorCatalog';

/**
 * Service for managing Deepgram API tokens
 * @class DeepgramTokenService
 */
export class DeepgramTokenService {
  private deepgram: ReturnType<typeof createClient>;

  /**
   * Creates a new DeepgramTokenService instance
   * @constructor
   */
  constructor() {
    this.deepgram = createClient(config.deepgramApiKey);
  }

  /**
   * Generates a temporary Deepgram token using grantToken (like demo)
   * This creates a token that inherits all permissions from the main API key
   * @param userId - Unique identifier for the user requesting the token
   * @param sessionId - Optional session identifier for tracking
   * @returns Token object with JWT string, expiration time, and ISO timestamp
   * @throws {AppError} If token generation fails or configuration is invalid
   */
  async generateProjectToken(userId: string, sessionId?: string): Promise<{
    token: string;
    expiresIn: number;
    expiresAt: string;
  }> {
    try {
      const expiresIn = config.deepgramTokenTtlMinutes * 60; // Convert minutes to seconds
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Use grantToken() like the demo - creates temporary token with full API key permissions
      // This is the correct method for Voice Agent API access
      const { result: tokenResponse, error: tokenError } = await this.deepgram.auth.grantToken();

      if (tokenError || !tokenResponse) {
        logError(LOG_CONTEXTS.DEEPGRAM, 'Failed to grant token', tokenError as Error);
        throw createDeepgramTokenError('Failed to generate Deepgram token', { userId, sessionId });
      }

      // SDK v4+ returns { access_token: string, expires_in: number }
      const token = (tokenResponse as { access_token?: string }).access_token;

      if (!token || typeof token !== 'string') {
        throw createDeepgramTokenError(
          `Token response missing access_token: ${JSON.stringify(tokenResponse)}`,
          { userId, sessionId }
        );
      }

      return {
        token,
        expiresIn,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      logError(LOG_CONTEXTS.DEEPGRAM, 'Deepgram token generation error', error as Error);

      if (error instanceof AppError) {
        throw error;
      }

      // Handle specific Deepgram API errors
      if (error && typeof error === 'object' && 'status' in error) {
        const errorObj = error as { status?: number; message?: string };
        const statusCode = errorObj.status;
        const message = errorObj.message || 'Deepgram API error';

        if (statusCode !== undefined) {
          if (statusCode === 401) {
            throw createConfigurationError('Invalid Deepgram API key', { statusCode });
          } else if (statusCode === 429) {
            throw createRateLimitError('Deepgram rate limit exceeded', { statusCode });
          } else if (statusCode >= 400 && statusCode < 500) {
            throw createExternalServiceError('Deepgram', message, { statusCode });
          }
        }
      }

      throw createDeepgramTokenError('Failed to generate Deepgram token', { userId, sessionId });
    }
  }

  /**
   * Generates a temporary access token with short TTL (backup method)
   * @returns Token object with short-lived access token (typically 30 seconds)
   * @throws {AppError} If token generation fails
   */
  async generateAccessToken(): Promise<{
    token: string;
    expiresIn: number;
    expiresAt: string;
  }> {
    try {
      const { result, error } = await this.deepgram.auth.grantToken();

      if (error || !result?.access_token) {
        logError(LOG_CONTEXTS.DEEPGRAM, 'Failed to grant access token', error as Error);
        throw createDeepgramTokenError('Failed to generate access token');
      }

      const expiresAt = new Date(Date.now() + result.expires_in * 1000);

      return {
        token: result.access_token,
        expiresIn: result.expires_in,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      logError(LOG_CONTEXTS.DEEPGRAM, 'Access token generation error', error as Error);

      if (error instanceof AppError) {
        throw error;
      }

      throw createDeepgramTokenError('Failed to generate access token');
    }
  }

  /**
   * Validates a Deepgram token by testing API connectivity
   * @param token - Deepgram token to validate
   * @returns True if token is valid, false otherwise
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      // For project keys, try to create a client and make a simple call
      const testClient = createClient(token);
      const { result, error} = await testClient.manage.getTokenDetails();
      return !error && !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the configured token time-to-live in minutes
   * @returns Token TTL in minutes
   */
  getTokenTtlMinutes(): number {
    return config.deepgramTokenTtlMinutes;
  }

  /**
   * Gets the configured Deepgram project ID (if explicitly set)
   * @returns Project ID string or undefined if using auto-detection
   */
  getConfiguredProjectId(): string | undefined {
    return config.deepgramProjectId;
  }

  /**
   * Checks Deepgram API connectivity using a read-only endpoint
   * This method does NOT create any resources or tokens on Deepgram's side
   * @returns Promise resolving to true if connected, false otherwise
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      // Use read-only getProjects endpoint to verify API connectivity
      // This validates the API key without creating any resources
      const { result, error } = await this.deepgram.manage.getProjects();
      return !error && !!result && !!result.projects;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Singleton instance of DeepgramTokenService
 * @constant deepgramTokenService
 */
export const deepgramTokenService = new DeepgramTokenService();