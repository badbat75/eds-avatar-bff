# BFF Server Tests

This directory contains test scripts for the EDS Avatar BFF (Backend for Frontend) service.

## Test Files

### `server-test.js`
Basic server functionality tests that don't require authentication:
- Health endpoint (`/api/health`)
- Root endpoint (`/`)
- Readiness endpoint (`/api/health/ready`)
- Protected endpoints (should fail without auth)
- 404 handling

### `auth-test.js`
Authentication and token generation tests:
- JWT token validation
- Deepgram configurable TTL token generation
- Protected endpoint access with valid tokens

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
```

### Run Authentication Tests
```bash
# From the BFF project root
node test/auth-test.js
```

## Expected Results

### Basic Tests
- All health endpoints should return `200 OK`
- Protected endpoints should return `401 Unauthorized`
- Non-existent endpoints should return `404 Not Found`

### Authentication Tests
- JWT validation should pass with valid tokens
- Deepgram token generation will succeed if:
  - Valid Deepgram API key is configured in `.env`
  - JWT token is valid
  - Server can reach Deepgram API

## Troubleshooting

### Server Not Running
```
❌ Test failed: connect ECONNREFUSED 127.0.0.1:3001
```
**Solution:** Start the server with `npm run dev`

### JWT Token Issues
```
❌ JWT token generation failed: invalid signature
```
**Solution:** Ensure `JWT_SECRET` in test matches your `.env` file

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
JWT_SECRET=your-super-secret-jwt-key-must-be-at-least-32-characters-long-for-security
DEEPGRAM_API_KEY=your-deepgram-api-key-here
DEEPGRAM_TOKEN_TTL_MINUTES=15
PORT=3001
```

## Token Duration Configuration

The BFF service supports configurable token durations:

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