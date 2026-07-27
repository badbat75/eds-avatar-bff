# BFF Server Tests

This directory contains the standalone smoke-test script for the EDS Avatar BFF (Backend for Frontend) service. The unit test suite (Vitest) lives alongside the sources in `src/` and runs with `npm test`.

## Test Files

### `server-test.js`

Basic server functionality probes that don't require authentication:

- Health endpoint (`/api/health`)
- Root endpoint (`/`)
- Readiness probe (`/api/health/ready`) - no such route exists, so it answers `404`
- Protected endpoints (should fail without the gate identity header)
- 404 handling

## Running Tests

### Prerequisites

1. Make sure the BFF server is running:
   ```bash
   npm run dev
   ```

2. Server should be available at `http://localhost:3001`

### Run Basic Tests

```bash
# From the BFF project root
node test/server-test.js

# Or via npm
npm run test:basic
```

## Expected Results

### Basic Tests

- `/api/health` returns `200 OK` when configuration and Deepgram connectivity both pass,
  `503 Service Unavailable` with `"status": "degraded"` otherwise
- Protected endpoints return `401 Unauthorized` with the message
  `Missing x-auth-email identity header`
- Non-existent endpoints (including `/api/health/ready`) return `404 Not Found`

Protected endpoints answer `401` here because this harness talks to the BFF directly,
bypassing nginx: without the reverse proxy nothing sets the gate identity header, which
is exactly the property the service depends on.

### Exercising an authenticated call by hand

There is no token to mint. To reach a protected endpoint, simulate what nginx does after
the bb-auth gate approves a request:

```bash
curl -H 'X-Auth-Email: test@example.com' http://localhost:3001/api/token/validate
```

This works only against a local instance: in production nothing but nginx can reach the
port, so nothing but nginx can set that header.

## Troubleshooting

### Server Not Running
```
❌ Test failed: connect ECONNREFUSED 127.0.0.1:3001
```
**Solution:** Start the server with `npm run dev`

### Server Refuses to Start
```
HOST must be loopback (127.0.0.1 or ::1), got: 0.0.0.0
```
**Solution:** Set `HOST=127.0.0.1` in `.env`. The gate's identity header is only
trustworthy while the reverse proxy is the sole reachable path to the port.

### Unauthorized on protected endpoints
```
Status: 401
Error: Missing x-auth-email identity header
```
**Solution:** Expected when calling the BFF directly. Only the reverse proxy sets that
header; to exercise an authenticated call, go through nginx (or set the header manually
as shown above).

### Deepgram API Errors
```
Status: 500
Error: Failed to generate access token
```
**Solution:**
1. Add valid `DEEPGRAM_API_KEY` to `.env`
2. Restart server
3. Check Deepgram account has API access

### Environment Configuration
Make sure your `.env` file has all required variables:
```env
HOST=127.0.0.1
PORT=3001
GATE_IDENTITY_HEADER=x-auth-email
DEEPGRAM_API_KEY=your-deepgram-api-key-here
DEEPGRAM_TOKEN_TTL_MINUTES=15
```

## Token Duration Configuration

The BFF service supports configurable Deepgram token durations:

- **Default**: 15 minutes
- **Range**: 1-1440 minutes (1 minute to 24 hours)
- **Configuration**: Set `DEEPGRAM_TOKEN_TTL_MINUTES` in `.env`

Examples:
```env
DEEPGRAM_TOKEN_TTL_MINUTES=5   # 5 minutes for short sessions
DEEPGRAM_TOKEN_TTL_MINUTES=30  # 30 minutes for longer sessions
DEEPGRAM_TOKEN_TTL_MINUTES=60  # 1 hour for extended use
```

## Test Configuration

The tests use these default values:
- Server URL: `http://localhost:3001`
- Test user: `test@example.com`
- Session ID: `test-session-123`

These can be modified in the test files if needed.
