import { createClient } from '@deepgram/sdk';
import { config } from '../config/environment';
import { AppError } from '../middleware/errorHandler';

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
        console.error('Failed to get projects:', projectsError);
        throw new AppError('Failed to access Deepgram projects', 500);
      }

      // Use the first project (or you could make this configurable)
      const projectId = projects.projects[0]?.project_id;

      if (!projectId) {
        throw new AppError('No project ID found in Deepgram projects', 500);
      }

      // Generate a project token with configurable expiry
      const { result: projectTokenResponse, error: keyError } = await this.deepgram.manage.createProjectKey(
        projectId,
        {
          comment: `BFF Token for user ${userId}${sessionId ? ` session ${sessionId}` : ''} (${config.deepgramTokenTtlMinutes}min TTL)`,
          scopes: ['usage:read', 'usage:write'],
          time_to_live_in_seconds: expiresIn,
        }
      );

      if (keyError || !projectTokenResponse?.key) {
        console.error('Failed to create project key:', keyError);
        throw new AppError('Failed to generate Deepgram token', 500);
      }

      return {
        token: projectTokenResponse.key,
        expiresIn,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      console.error('Deepgram token generation error:', error);

      if (error instanceof AppError) {
        throw error;
      }

      // Handle specific Deepgram API errors
      if (error && typeof error === 'object' && 'status' in error) {
        const statusCode = (error as any).status;
        const message = (error as any).message || 'Deepgram API error';

        if (statusCode === 401) {
          throw new AppError('Invalid Deepgram API key', 500);
        } else if (statusCode === 429) {
          throw new AppError('Rate limit exceeded', 429);
        } else if (statusCode >= 400 && statusCode < 500) {
          throw new AppError(`Deepgram client error: ${message}`, 400);
        }
      }

      throw new AppError('Failed to generate Deepgram token', 500);
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
        console.error('Failed to grant access token:', error);
        throw new AppError('Failed to generate access token', 500);
      }

      const expiresAt = new Date(Date.now() + result.expires_in * 1000);

      return {
        token: result.access_token,
        expiresIn: result.expires_in,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      console.error('Access token generation error:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to generate access token', 500);
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