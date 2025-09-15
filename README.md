# EDS Avatar BFF (Backend for Frontend)

A secure JWT-authenticated API service that generates time-bounded Deepgram tokens for the EDS Avatar frontend application. Built with Auth0 integration and enterprise-grade security features.

## Features

- **🔐 JWT Authentication**: Multi-algorithm JWT token validation (RS256, HS256) with Auth0 integration
- **⏰ Deepgram Token Management**: Generates secure 15-minute time-bounded Deepgram project tokens
- **🛡️ Advanced Security**: JWKS caching, rate limiting, CORS, and Helmet.js security headers
- **🚀 High Performance**: Configurable caching and connection pooling for optimal throughput
- **📊 Health Monitoring**: Comprehensive health check and readiness endpoints
- **🔧 TypeScript**: Full TypeScript support with strict type checking
- **🌐 Auth0 Integration**: Native support for Auth0 RS256 tokens with dynamic key fetching

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Deepgram API key

### Installation

```bash
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Authentication (Auth0 Integration)
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-chars
JWT_ISSUER=https://your-tenant.auth0.com/
JWT_AUDIENCE=https://your-tenant.auth0.com/api/v2/

# JWT Cipher Configuration
JWT_ALGORITHM=RS256
JWT_VERIFY_ALGORITHMS=RS256,HS256
JWKS_CACHE_MAX_ENTRIES=5
JWKS_CACHE_MAX_AGE_MS=600000
JWKS_REQUEST_TIMEOUT_MS=30000

# Deepgram Configuration
DEEPGRAM_API_KEY=your-deepgram-api-key-here
DEEPGRAM_TOKEN_TTL_MINUTES=15

# Security Configuration
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication
All protected endpoints require a valid JWT token in the `Authorization` header using the `Bearer` scheme. The BFF supports multiple JWT algorithms and integrates seamlessly with Auth0.

---

### 🔐 Token Management

#### `POST /api/token/deepgram`
Generates a new time-bounded Deepgram project token for voice agent connections.

**Authentication:** Required

**Headers:**
```http
Authorization: Bearer <auth0-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "optional-session-identifier"
}
```

**Response (200 OK):**
```json
{
  "token": "d53b1a16ba398618d5a28948ac99be3e1e6f6d07",
  "expiresIn": 900,
  "expiresAt": "2025-01-15T14:37:21.671Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: JWT validation failed
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Deepgram token generation failed

---

#### `GET /api/token/validate`
Validates the current JWT token and returns user information.

**Authentication:** Required

**Headers:**
```http
Authorization: Bearer <auth0-jwt-token>
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": "email|6899fed0f215c1cc4a28db25"
  },
  "expiresAt": "2025-01-16T14:19:36.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing authorization header
- `403 Forbidden`: Invalid token, expired, or malformed

---

### 📊 Health & Monitoring

#### `GET /api/health`
Comprehensive health check endpoint with system information.

**Authentication:** None

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T14:11:18.870Z",
  "service": "eds-avatar-bff",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 3600.123,
  "memory": {
    "rss": 107573248,
    "heapTotal": 16826368,
    "heapUsed": 15435992,
    "external": 4302667,
    "arrayBuffers": 95985
  }
}
```

---

#### `GET /api/health/ready`
Kubernetes/Docker readiness probe endpoint.

**Authentication:** None

**Response (200 OK):**
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T14:11:18.870Z",
  "checks": {
    "deepgram": "configured",
    "jwt": "configured"
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "not ready",
  "timestamp": "2025-01-15T14:11:18.870Z",
  "message": "Required services not configured"
}
```

---

### 🚫 Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error description",
  "timestamp": "2025-01-15T14:11:18.870Z"
}
```

**Common HTTP Status Codes:**
- `400 Bad Request`: Invalid request body or parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Authentication failed or insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded (includes `Retry-After` header)
- `500 Internal Server Error`: Server-side error (details logged securely)

## 🛡️ Security Features

### Authentication & Authorization
- **🔐 Multi-Algorithm JWT Support**: RS256, HS256, HS384, HS512, RS384, RS512, ES256, ES384, ES512
- **🌐 Auth0 Integration**: Native JWKS endpoint integration with automatic key rotation
- **⚡ JWKS Caching**: Configurable caching (1-100 entries, 1min-1hour TTL) for optimal performance
- **🎯 Strict Validation**: Issuer, audience, algorithm, and expiration validation
- **⏰ Time-Bounded Tokens**: Deepgram tokens with configurable TTL (1-1440 minutes)

### Network Security
- **🚧 Rate Limiting**: Configurable per-IP rate limiting with sliding window
- **🌍 CORS Protection**: Whitelist-based origin validation with preflight support
- **🛡️ Security Headers**: Comprehensive Helmet.js security headers
- **🔒 TLS Ready**: Production-ready for HTTPS/TLS termination

### Data Protection
- **✅ Input Validation**: Request body validation and sanitization
- **🤐 Secure Error Handling**: No sensitive information leakage in error responses
- **📝 Audit Logging**: Request/response logging with configurable levels
- **💾 Memory Safety**: Automatic cleanup and garbage collection monitoring

## ⚙️ Environment Variables

### Core Server Settings
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port number (1-65535) |
| `NODE_ENV` | No | `development` | Runtime environment (development, production, test) |

### JWT Authentication
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret (minimum 32 characters) |
| `JWT_ISSUER` | Yes* | `eds-avatar-bff` | JWT issuer (Auth0 domain or BFF identifier) |
| `JWT_AUDIENCE` | Yes* | `eds-avatar-frontend` | JWT audience (API identifier) |

### JWT Cipher Configuration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ALGORITHM` | No | `RS256` | Primary JWT algorithm (RS256, HS256, etc.) |
| `JWT_VERIFY_ALGORITHMS` | No | `RS256,HS256` | Comma-separated allowed algorithms |
| `JWKS_CACHE_MAX_ENTRIES` | No | `5` | JWKS cache max entries (1-100) |
| `JWKS_CACHE_MAX_AGE_MS` | No | `600000` | JWKS cache TTL in ms (1min-1hour) |
| `JWKS_REQUEST_TIMEOUT_MS` | No | `30000` | JWKS fetch timeout in ms (5sec-1min) |

### Deepgram Integration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPGRAM_API_KEY` | Yes | - | Deepgram API key from console.deepgram.com |
| `DEEPGRAM_TOKEN_TTL_MINUTES` | No | `15` | Token expiration minutes (1-1440) |

### Security & Performance
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ALLOWED_ORIGINS` | No | `http://localhost:8080` | CORS allowed origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in ms (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window per IP |

**\*Required for Auth0 integration**

## Architecture

The BFF follows a clean architecture pattern:

```
src/
├── config/         # Configuration and environment handling
├── middleware/     # Express middleware (auth, error handling)
├── routes/         # API route handlers
├── types/          # TypeScript type definitions
├── utils/          # Utility functions (Deepgram service)
└── index.ts        # Application entry point
```

## 🔗 Frontend Integration

### Authentication Flow
1. **Frontend** authenticates with Auth0 using the React SDK
2. **Auth0** returns an RS256 JWT token with your API audience
3. **Frontend** uses the JWT token to request Deepgram tokens from the BFF
4. **BFF** validates the JWT and returns time-bounded Deepgram tokens
5. **Frontend** connects to Deepgram Voice Agent using the project token

### Example Implementation

#### React Frontend Setup
```typescript
// auth0-config.ts
import { Auth0Provider } from '@auth0/auth0-react';

const authConfig = {
  domain: 'your-tenant.auth0.com',
  clientId: 'your-client-id',
  authorizationParams: {
    audience: 'https://your-tenant.auth0.com/api/v2/',
    scope: 'openid profile email offline_access'
  }
};
```

#### JWT Token Management
```typescript
// Get Auth0 access token
import { useAuth0 } from '@auth0/auth0-react';

const { getAccessTokenSilently } = useAuth0();

const auth0Token = await getAccessTokenSilently({
  audience: 'https://your-tenant.auth0.com/api/v2/',
});
```

#### BFF Integration
```typescript
// Get Deepgram token from BFF
const getDeepgramToken = async (sessionId?: string) => {
  try {
    const response = await fetch('http://localhost:3001/api/token/deepgram', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth0Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      throw new Error(`BFF Error: ${response.status} ${response.statusText}`);
    }

    const { token, expiresAt, expiresIn } = await response.json();
    return { token, expiresAt, expiresIn };
  } catch (error) {
    console.error('Failed to get Deepgram token:', error);
    throw error;
  }
};
```

#### Deepgram Voice Agent Connection
```typescript
// Connect to Deepgram Voice Agent
const connectToVoiceAgent = async () => {
  const { token } = await getDeepgramToken('session-123');

  const wsUrl = 'wss://agent.deepgram.com/v1/agent/converse';
  const connection = new WebSocket(wsUrl, ['token', token]);

  connection.onopen = () => {
    console.log('Connected to Deepgram Voice Agent');
  };

  connection.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle voice agent responses
  };

  connection.onerror = (error) => {
    console.error('Voice Agent connection error:', error);
  };

  return connection;
};
```

#### Error Handling
```typescript
// Robust error handling with token refresh
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let token = await getAccessTokenSilently();

  const makeRequest = (authToken: string) =>
    fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

  let response = await makeRequest(token);

  // Retry once with fresh token on 401/403
  if (response.status === 401 || response.status === 403) {
    token = await getAccessTokenSilently({ cacheMode: 'off' });
    response = await makeRequest(token);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response;
};
```

### Production Considerations
- **Token Refresh**: Implement automatic Auth0 token refresh before expiration
- **Error Recovery**: Handle network errors and BFF unavailability gracefully
- **Rate Limiting**: Respect BFF rate limits and implement exponential backoff
- **Security**: Never log or expose JWT tokens in production
- **Monitoring**: Track token generation success rates and latency