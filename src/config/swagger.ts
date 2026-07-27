/**
 * Swagger/OpenAPI configuration
 * @module config/swagger
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './environment';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'EDS Avatar BFF API',
    version: '1.0.0',
    description: 'Backend for Frontend service providing Deepgram token generation and prompt management for the EDS Avatar application, authenticated by the bb-auth reverse-proxy gate',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: `http://${config.host}:${config.port}`,
      description: `${config.nodeEnv} server`,
    },
  ],
  components: {
    securitySchemes: {
      GateIdentity: {
        type: 'apiKey',
        in: 'header',
        name: config.gateIdentityHeader,
        description:
          'Authorized email injected by nginx after the bb-auth gate approved the ' +
          'request. Callers never set it: nginx overwrites it on every proxied request.',
      },
    },
    schemas: {
      DeepgramTokenRequest: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: {
            type: 'string',
            description: 'Unique identifier for the user requesting the token',
            example: 'user@example.com',
          },
          sessionId: {
            type: 'string',
            description: 'Optional session identifier for tracking',
            example: 'sess_abc123',
          },
        },
      },
      DeepgramTokenResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'The Deepgram access token (JWT format)',
          },
          expiresIn: {
            type: 'number',
            description: 'Token lifetime in seconds',
            example: 900,
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 timestamp when the token expires',
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error category',
            example: 'Validation Error',
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
          },
          statusCode: {
            type: 'number',
            description: 'HTTP status code',
          },
          code: {
            type: 'string',
            description: 'Machine-readable error code',
            example: 'VALIDATION_FAILED',
          },
          context: {
            type: 'object',
            description: 'Additional error context and metadata',
          },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'error'],
            description: 'Overall health status',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp of health check',
          },
          service: {
            type: 'string',
            description: 'Service name',
            example: 'eds-avatar-bff',
          },
          version: {
            type: 'string',
            description: 'Service version',
            example: '1.0.0',
          },
          environment: {
            type: 'string',
            description: 'Node environment',
            example: 'production',
          },
          uptime: {
            type: 'number',
            description: 'Process uptime in seconds',
          },
          memory: {
            type: 'object',
            description: 'Memory usage information',
          },
          checks: {
            type: 'object',
            properties: {
              config: {
                type: 'boolean',
                description: 'Configuration validation status',
              },
              deepgram: {
                type: 'boolean',
                description: 'Deepgram API connectivity status',
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      GateIdentity: [],
    },
  ],
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  // Paths to files containing OpenAPI annotations
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
