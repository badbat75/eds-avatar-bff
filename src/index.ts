import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { correlationIdMiddleware } from './middleware/correlationId';
import tokenRoutes from './routes/token';
import healthRoutes from './routes/health';
import promptRoutes from './routes/prompt';
import { logInfo, logError, LOG_CONTEXTS } from './utils/logger';

const app = express();

// Configure trust proxy - needed when behind reverse proxy (nginx, etc.)
// This allows express-rate-limit to correctly identify users via X-Forwarded-For header
// Only trust proxies on localhost/loopback to prevent IP spoofing
app.set('trust proxy', 'loopback');

// Correlation ID middleware (must be first to track all requests)
app.use(correlationIdMiddleware);

// Security middleware (with exception for Swagger UI)
app.use((req, res, next) => {
  // Skip CSP for Swagger UI to allow inline scripts and styles
  if (req.path.startsWith('/api/docs')) {
    return next();
  }
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\''],
        scriptSrc: ['\'self\''],
        imgSrc: ['\'self\'', 'data:', 'https:'],
      },
    },
  })(req, res, next);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logInfo(LOG_CONTEXTS.HTTP, 'Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    correlationId: req.correlationId,
  });
  next();
});

// API Documentation (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'EDS Avatar BFF API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/prompt', promptRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'eds-avatar-bff',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      documentation: '/api/docs',
      health: '/api/health',
      token: '/api/token/deepgram',
      prompt: '/api/prompt',
    },
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logInfo(LOG_CONTEXTS.SHUTDOWN, 'Received shutdown signal', { signal });

  server.close((err) => {
    if (err) {
      logError(LOG_CONTEXTS.SHUTDOWN, 'Error during server shutdown', err);
      process.exit(1);
    }

    logInfo(LOG_CONTEXTS.SHUTDOWN, 'Server shut down successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logError(LOG_CONTEXTS.SHUTDOWN, 'Force shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(LOG_CONTEXTS.ERROR, 'Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(LOG_CONTEXTS.ERROR, 'Unhandled rejection', reason as Error, { promise: String(promise) });
  process.exit(1);
});

// Start server
const server = app.listen(config.port, config.host, () => {
  logInfo(LOG_CONTEXTS.STARTUP, 'EDS Avatar BFF Server started', {
    host: config.host,
    port: config.port,
    environment: config.nodeEnv,
    healthEndpoint: '/api/health',
    tokenEndpoint: '/api/token/deepgram',
  });
});

export default app;