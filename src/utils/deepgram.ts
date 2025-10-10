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

export class DeepgramTokenService {
  private deepgram: ReturnType<typeof createClient>;

  constructor() {
    this.deepgram = createClient(config.deepgramApiKey);
  }

  // Generate configurable TTL project keys
  async generateProjectToken(userId: string, sessionId?: string): Promise<{
    token: string;
    expiresIn: number;
    expiresAt: string;
  }> {
    try {
      const expiresIn = config.deepgramTokenTtlMinutes * 60; // Convert minutes to seconds
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // First get the projects to find the project ID
      const { result: projects, error: projectsError } = await this.deepgram.manage.getProjects();

      if (projectsError || !projects || !projects.projects || projects.projects.length === 0) {
        logError(LOG_CONTEXTS.DEEPGRAM, 'Failed to get projects', projectsError as Error);
        throw createExternalServiceError('Deepgram', 'Failed to access Deepgram projects');
      }

      // Use the first project (or you could make this configurable)
      const projectId = projects.projects[0]?.project_id;

      if (!projectId) {
        throw createConfigurationError('No project ID found in Deepgram projects');
      }

      // Generate a project token with configurable expiry
      const { result: projectTokenResponse, error: keyError } = await this.deepgram.manage.createProjectKey(
        projectId,
        {
          comment: `BFF Token for user ${userId}${sessionId ? ` session ${sessionId}` : ''} (${config.deepgramTokenTtlMinutes}min TTL)`,
          scopes: ['usage:read', 'usage:write'],
          time_to_live_in_seconds: expiresIn,
        },
      );

      if (keyError || !projectTokenResponse?.key) {
        logError(LOG_CONTEXTS.DEEPGRAM, 'Failed to create project key', keyError as Error);
        throw createDeepgramTokenError('Failed to generate Deepgram token', { userId, sessionId });
      }

      return {
        token: projectTokenResponse.key,
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

  // Generate temporary access tokens (30 seconds TTL) - backup method
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

  async validateToken(token: string): Promise<boolean> {
    try {
      // For project keys, try to create a client and make a simple call
      const testClient = createClient(token);
      const { result, error } = await testClient.manage.getTokenDetails();
      return !error && !!result;
    } catch (error) {
      return false;
    }
  }

  // Get current TTL configuration
  getTokenTtlMinutes(): number {
    return config.deepgramTokenTtlMinutes;
  }
}

export const deepgramTokenService = new DeepgramTokenService();