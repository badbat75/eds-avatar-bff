# JWT Configuration Guide for Auth0 BFF Integration

This guide provides step-by-step instructions for configuring JWT secrets, issuers, and audience values from your Auth0 tenant for secure integration with the EDS Avatar BFF service.

## Prerequisites

- Auth0 account with administrative access
- Access to your Auth0 Dashboard
- Node.js environment for generating secure secrets

## Step 1: Access Your Auth0 Dashboard

1. Log in to your [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to your tenant (if you have multiple tenants)

## Step 2: Create or Configure Your Application

### For New Applications:
1. Click **Applications** in the left sidebar
2. Click **Create Application**
3. Choose your application type:
   - **Single Page Application (SPA)** - for React frontend
   - **Machine to Machine** - for BFF API authentication
4. Configure the application settings

### For Existing Applications:
1. Navigate to **Applications** → **Applications**
2. Select your existing application

## Step 3: Gather JWT Configuration Values

### JWT_ISSUER Configuration
The JWT issuer should be your Auth0 domain URL:

```env
JWT_ISSUER=https://your-tenant.auth0.com/
```

**To find your issuer:**
1. In your Auth0 Dashboard, go to **Settings** → **General**
2. Copy your **Domain** value (e.g., `your-tenant.auth0.com`)
3. Format as: `https://your-domain/` (include trailing slash)

### JWT_AUDIENCE Configuration
The audience identifies your API:

```env
JWT_AUDIENCE=your-api-identifier
```

**To configure your audience:**
1. Go to **Applications** → **APIs**
2. Either create a new API or select existing one
3. Copy the **Identifier** value (e.g., `https://your-api.example.com`)
4. Use this as your `JWT_AUDIENCE` value

## Step 4: Generate Secure JWT_SECRET

The JWT_SECRET should be a cryptographically secure random string of at least 32 characters.

### Option A: Generate via Node.js
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Option B: Generate via OpenSSL
```bash
openssl rand -hex 64
```

### Option C: Use Online Generator
Visit a reputable random string generator and create a 64+ character string.

## Step 5: Configure Your .env File

Update your `C:\Users\Emiliano\git\eds-avatar-bff\.env` file:

```env
# Replace with your actual values
JWT_SECRET=your-generated-64-character-hex-string
JWT_ISSUER=https://your-tenant.auth0.com/
JWT_AUDIENCE=your-api-identifier

# Example:
# JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456789012345678901234567890abcdef12345678
# JWT_ISSUER=https://eds-avatar-dev.auth0.com/
# JWT_AUDIENCE=https://api.eds-avatar.com
```

## Step 6: Verify Configuration

### In Auth0 Dashboard:
1. **Applications** → **APIs** → Your API
2. Verify the **Identifier** matches your `JWT_AUDIENCE`
3. **Applications** → **Applications** → Your App
4. Verify **Domain** matches your `JWT_ISSUER` (without https:// and trailing /)

### Test JWT Token Validation:
1. Generate a test token from Auth0
2. Use a JWT debugging tool to verify:
   - `iss` claim matches your `JWT_ISSUER`
   - `aud` claim matches your `JWT_AUDIENCE`

## Step 7: Configure CORS and Allowed Origins

In your Auth0 application settings:

1. **Allowed Callback URLs**: `http://localhost:8080`
2. **Allowed Web Origins**: `http://localhost:8080`
3. **Allowed Origins (CORS)**: `http://localhost:8080,http://localhost:3001`

## Security Best Practices

### JWT_SECRET Requirements:
- **Minimum length**: 32 characters (256 bits)
- **Recommended length**: 64+ characters (512+ bits)
- **Character set**: Use hex, base64, or alphanumeric
- **Generation**: Use cryptographically secure random generators
- **Storage**: Never commit to version control
- **Rotation**: Rotate periodically for enhanced security

### Environment Variables:
- Keep `.env` files out of version control
- Use different secrets for different environments
- Validate configuration on application startup

## Troubleshooting

### Common Issues:

1. **Token validation fails**:
   - Check issuer URL includes trailing slash
   - Verify audience matches API identifier exactly
   - Ensure JWT_SECRET is properly formatted

2. **CORS errors**:
   - Add your frontend URL to Allowed Origins
   - Include both frontend (8080) and BFF (3001) ports

3. **Authentication errors**:
   - Verify application type matches your use case
   - Check grant types are properly configured
   - Ensure callback URLs are whitelisted

### Debug Commands:
```bash
# Verify environment variables are loaded
node -e "console.log(process.env.JWT_SECRET?.substring(0, 8) + '...')"

# Test BFF token endpoint
curl -X POST http://localhost:3001/api/token/deepgram \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Related Documentation

- [Auth0 JWT Validation](https://auth0.com/docs/tokens/json-web-tokens/validate-json-web-tokens)
- [Auth0 API Configuration](https://auth0.com/docs/get-started/apis)
- [JWT.io Debugger](https://jwt.io/) - for token inspection
- [EDS Avatar BFF API Documentation](../README.md)