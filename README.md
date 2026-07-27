# EDS Avatar BFF (Backend for Frontend)

A secure API service that generates time-bounded Deepgram tokens and serves AI prompts for the EDS Avatar frontend application. It verifies no token of its own: the bb-auth reverse-proxy gate authenticates every request before it arrives, and nginx injects the authorized email as an identity header.

## Features

- **🔐 Gate Authentication**: Trusts the identity header injected by nginx after the bb-auth `auth_request` — no JWT, no JWKS, no shared secret
- **🚪 Loopback-Only Binding**: Refuses to start on a non-loopback host, keeping the trusted header unreachable from off-host
- **⏰ Deepgram Token Management**: Generates secure 15-minute time-bounded Deepgram project tokens
- **📝 Prompt Management**: Serves the AI assistant prompt from disk, hot-reloaded when the file changes
- **🛡️ Advanced Security**: Rate limiting and Helmet.js security headers
- **📊 Health Monitoring**: Health check with cached Deepgram connectivity probe
- **🔧 TypeScript**: Full TypeScript support with strict type checking
- **📚 OpenAPI Docs**: Swagger UI served at `/api/docs`

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Deepgram API key
- An nginx vhost wired to the bb-auth gate (see [Authentication](#authentication))

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
# HOST must be loopback: the identity header is only trustworthy while the reverse
# proxy that sets it is the sole reachable path to this port. The service refuses
# to start otherwise.
HOST=127.0.0.1
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug

# Authentication (bb-auth reverse-proxy gate)
# Header name nginx sets with proxy_set_header in the gated location
GATE_IDENTITY_HEADER=x-auth-email

# Deepgram Configuration
DEEPGRAM_API_KEY=your-deepgram-api-key-here
# DEEPGRAM_PROJECT_ID=          # optional, defaults to the first project
DEEPGRAM_TOKEN_TTL_MINUTES=15

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# Type checking
npm run typecheck

# Unit tests (Vitest)
npm test

# Linting
npm run lint
```

> ⚠️ `npm run lint` currently fails: the repo ships an `.eslintrc.json`, but ESLint 9 expects
> the flat-config format (`eslint.config.js`). Use `npm run typecheck` until the config is migrated.

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

## API Endpoints

Interactive documentation is available at `/api/docs`. The OpenAPI security scheme is
`GateIdentity` (`apiKey`, `in: header`), named after `GATE_IDENTITY_HEADER`.

### Authentication

Protected endpoints require the gate identity header (`GATE_IDENTITY_HEADER`, default
`x-auth-email`). Callers never set it: nginx overwrites it on every request it forwards,
and omits it entirely when the gate returned no identity. There is no bearer token —
an `Authorization` header is ignored, and clients must not send one. Browser requests are
authenticated by the gate's HttpOnly session cookie, so frontend `fetch` calls use
`credentials: 'include'` against the same origin.

**Why this is safe, and what it depends on:** `proxy_set_header` overwrites any
client-supplied identity header and omits it when the gate returned nothing, so a caller
cannot forge an identity *through nginx*. That guarantee holds only while nginx is the sole
reachable path — anything able to connect to the port directly could set the header itself.
This is why `HOST` must be loopback (`127.0.0.1`, `::1` or `localhost`): `validateConfig()`
throws at startup otherwise.

---

### 🔐 Token Management

#### `POST /api/token/deepgram`

Generates a new time-bounded Deepgram project token for voice agent connections.

**Authentication:** Required

**Headers:**

```http
X-Auth-Email: user@example.com   # injected by nginx, never by the client
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

- `400 Bad Request`: Invalid request body (e.g. a `sessionId` longer than 100 characters)
- `401 Unauthorized`: `Missing x-auth-email identity header`
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Deepgram token generation failed

---

#### `GET /api/token/validate`

Returns the identity the gate established for this request. This is also how the
frontend answers "who am I": the session cookie is HttpOnly, so the page cannot read it.

**Authentication:** Required

**Headers:**

```http
X-Auth-Email: user@example.com   # injected by nginx, never by the client
```

**Response (200 OK):**

```json
{
  "valid": true,
  "user": {
    "id": "user@example.com",
    "email": "user@example.com"
  }
}
```

The gate forwards an email and nothing else, so there is no `name` claim — and no
`expiresAt`, since the session lives in a cookie this service never sees.

**Error Responses:**

- `401 Unauthorized`: `Missing x-auth-email identity header`

---

### 💬 Prompt Management

#### `GET /api/prompt/assistant`

Returns the current AI assistant prompt. The file is watched and reloaded on change.

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "prompt": "You are ...",
    "lastModified": "2025-01-15T14:11:18.870Z",
    "version": "1.0.0"
  },
  "timestamp": "2025-01-15T14:11:18.870Z"
}
```

#### `GET /api/prompt/info`

Returns metadata about the prompt configuration: file path, last modified, version and
prompt length. Prompts can only be updated by editing the file directly on the server.

**Authentication:** Required

---

### 📊 Health & Monitoring

#### `GET /api/health`

Health check with configuration validation and Deepgram connectivity. The connectivity
probe is cached for one minute to avoid overloading the Deepgram API.

**Authentication:** None

**Response (200 OK):**

```json
{
  "status": "healthy",
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
  },
  "checks": {
    "config": true,
    "deepgram": true
  }
}
```

**Response (503 Service Unavailable):** same body with `"status": "degraded"` and the
failing entry in `checks` set to `false`. An unexpected failure returns `503` with
`"status": "error"` and a `message` field instead.

---

### 🚫 Error Handling

Errors raised by the application layer go through the shared error handler:

```json
{
  "error": "Bad Request",
  "message": "Validation failed: sessionId - sessionId must be 100 characters or less",
  "statusCode": 400,
  "code": "VALIDATION_FAILED"
}
```

Some errors add an optional `context` object with extra metadata.

The gate check runs before that handler and answers with just the two fields:

```json
{
  "error": "Unauthorized",
  "message": "Missing x-auth-email identity header"
}
```

**Common HTTP Status Codes:**

- `400 Bad Request`: Invalid request body or parameters
- `401 Unauthorized`: The gate forwarded no identity header
- `404 Not Found`: Unknown route
- `429 Too Many Requests`: Rate limit exceeded (includes `Retry-After` header)
- `500 Internal Server Error`: Server-side error (details logged securely)

## 🛡️ Security Features

### Authentication & Authorization

- **🔐 Proxy-Enforced Identity**: nginx overwrites the identity header on every proxied request, so a client cannot supply its own
- **🚪 Loopback-Only Binding**: the service refuses to start on a non-loopback host, since a reachable port would let anyone set that header
- **🧭 Loopback-Scoped Trust Proxy**: `trust proxy` is set to `loopback`, so `X-Forwarded-For` cannot be spoofed for rate limiting
- **⏰ Time-Bounded Tokens**: Deepgram tokens with configurable TTL (1-1440 minutes)

### Network Security

- **🚧 Rate Limiting**: Configurable per-IP rate limiting on `/api/`
- **🛡️ Security Headers**: Helmet.js headers with a strict CSP (relaxed only for the Swagger UI route)
- **🌍 CORS**: **not** handled by this service — there is no `cors` middleware and no `cors` dependency. CORS headers belong to nginx; see [docs/NGINX_CORS_CONFIGURATION.md](docs/NGINX_CORS_CONFIGURATION.md)
- **🔒 TLS Ready**: Production-ready for HTTPS/TLS termination at the proxy

### Data Protection

- **✅ Input Validation**: Zod-based request body validation
- **🤐 Secure Error Handling**: No sensitive information leakage in error responses
- **📝 Audit Logging**: Request/response logging with configurable levels and correlation ids
- **💾 Memory Safety**: Graceful shutdown plus uptime and memory reporting

## ⚙️ Environment Variables

### Core Server Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST` | No | `127.0.0.1` | Bind address. **Must be loopback** (`127.0.0.1`, `::1`, `localhost`) - the service refuses to start otherwise |
| `PORT` | No | `3001` | Server port number (1-65535) |
| `NODE_ENV` | No | `development` | Runtime environment (development, production, test) |
| `LOG_LEVEL` | No | `debug` in development, otherwise `info` | Log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

### Authentication (bb-auth gate)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GATE_IDENTITY_HEADER` | No | `x-auth-email` | Header carrying the gate-authenticated email; must match the `proxy_set_header` name in the nginx vhost. Lowercased on load and must not be empty |

### Deepgram Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPGRAM_API_KEY` | Yes | - | Deepgram API key from console.deepgram.com |
| `DEEPGRAM_PROJECT_ID` | No | first project on the account | Explicit Deepgram project ID |
| `DEEPGRAM_TOKEN_TTL_MINUTES` | No | `15` | Token expiration minutes (1-1440) |

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in ms (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window per IP |

## Architecture

The BFF follows a clean architecture pattern:

```
src/
├── config/         # Environment validation and Swagger definition
├── errors/         # Error catalog and factories
├── middleware/     # Express middleware (gate auth, validation, errors, correlation id)
├── routes/         # API route handlers (token, prompt, health)
├── schemas/        # Zod request schemas
├── services/       # Prompt service with file watching
├── types/          # TypeScript type definitions
├── utils/          # Utility functions (Deepgram service, logger)
└── index.ts        # Application entry point
```

## 🔗 Frontend Integration

### Authentication Flow

1. **Browser** requests the app; nginx runs an `auth_request` against the bb-auth gate
2. **Gate** either approves (returning the authorized email) or redirects the browser to the shared login page
3. **nginx** injects that email as `X-Auth-Email` on every request it proxies to the BFF
4. **BFF** trusts the header, and returns time-bounded Deepgram tokens
5. **Frontend** connects to Deepgram Voice Agent using the project token

The frontend holds no token at all: its BFF calls are same-origin and carry the gate's
HttpOnly session cookie. The frontend build, this service, and the nginx vhost must all
be switched together.

### Example Implementation

#### Discovering the current user

```typescript
// No token, no Authorization header: the gate's session cookie is the credential
const whoAmI = async () => {
  const response = await fetch('/api/token/validate', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`BFF Error: ${response.status} ${response.statusText}`);
  }

  const { user } = await response.json();
  return user; // { id, email }
};
```

#### BFF Integration

```typescript
// Get Deepgram token from BFF
const getDeepgramToken = async (sessionId?: string) => {
  try {
    const response = await fetch('/api/token/deepgram', {
      method: 'POST',
      // Same-origin call through nginx: the gate's session cookie is the credential
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
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
// A 401 means the gate session expired. There is no token to refresh: hand the browser
// back to nginx, which bounces unauthenticated requests to the shared login page.
const fetchViaGate = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (response.status === 401) {
    window.location.reload();
    throw new Error('Gate session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response;
};
```

### Production Considerations

- **Same Origin**: Serve the frontend and the BFF from the same nginx vhost so the gate cookie reaches every API call
- **Session Expiry**: On a 401, let the browser re-authenticate against the gate rather than retrying
- **Error Recovery**: Handle network errors and BFF unavailability gracefully
- **Rate Limiting**: Respect BFF rate limits and implement exponential backoff
- **Security**: Never log or expose Deepgram tokens or user emails in production
- **Monitoring**: Track token generation success rates and latency
