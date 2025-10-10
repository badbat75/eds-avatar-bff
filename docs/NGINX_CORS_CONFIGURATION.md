# Nginx CORS Configuration

## Overview

CORS (Cross-Origin Resource Sharing) is handled at the **nginx reverse proxy level** rather than in the Express application. This provides centralized control over CORS policies and reduces application complexity.

## Why Nginx Handles CORS

1. **Centralized Management**: CORS policy is configured in one place (nginx) rather than duplicated across applications
2. **Performance**: nginx handles CORS headers efficiently without Node.js overhead
3. **Separation of Concerns**: Application code focuses on business logic, not HTTP header management
4. **Consistent Policy**: All applications behind the same nginx instance share the same CORS policy

## Current Configuration

The BFF service at `mpa-dev.badbat75.com` uses the following nginx CORS configuration:

```nginx
# BFF API routes
location /api/ {
    proxy_pass http://127.0.0.1:8280;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # CORS headers
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
}
```

## CORS Policy Options

### 1. Allow All Origins (Current - Development Only)

**Configuration:**
```nginx
add_header Access-Control-Allow-Origin * always;
```

**Use Case:** Development and testing
**Security:** ⚠️ **Not recommended for production** - allows any website to access your API

### 2. Allow Specific Origin (Recommended for Production)

**Configuration:**
```nginx
add_header Access-Control-Allow-Origin https://mpa-dev.badbat75.com always;
```

**Use Case:** Production with single frontend domain
**Security:** ✅ Secure - only allows specified origin

### 3. Allow Multiple Specific Origins (Best for Multi-Domain)

**Configuration:**
```nginx
# Map to determine if origin is allowed
map $http_origin $cors_origin {
    default "";
    "~^https://mpa-dev\.badbat75\.com$" $http_origin;
    "~^https://badbat75\.asuscomm\.com$" $http_origin;
    "~^http://localhost:8080$" $http_origin;
}

# In location block:
add_header Access-Control-Allow-Origin $cors_origin always;
```

**Use Case:** Production with multiple frontend domains (dev, staging, prod)
**Security:** ✅ Secure - whitelists specific origins

### 4. Dynamic Origin with Regex (Advanced)

**Configuration:**
```nginx
map $http_origin $cors_origin {
    default "";
    "~^https://([a-z0-9-]+\.)?badbat75\.com$" $http_origin;
}

add_header Access-Control-Allow-Origin $cors_origin always;
```

**Use Case:** Allow all subdomains of a specific domain
**Security:** ⚠️ Use carefully - validates regex pattern

## Required CORS Headers

### Minimum Configuration

```nginx
add_header Access-Control-Allow-Origin <origin> always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
```

### With Credentials Support

If your frontend needs to send cookies or authentication headers:

```nginx
add_header Access-Control-Allow-Origin <specific-origin> always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
add_header Access-Control-Allow-Credentials true always;
```

⚠️ **Note:** When using `Access-Control-Allow-Credentials: true`, you **cannot** use `Access-Control-Allow-Origin: *`. You must specify an exact origin.

### Handling Preflight Requests

For complex requests, browsers send an OPTIONS preflight request:

```nginx
location /api/ {
    # Handle OPTIONS requests (preflight)
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin $cors_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        add_header Access-Control-Max-Age 86400 always;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    # Regular request handling
    proxy_pass http://127.0.0.1:8280;
    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
}
```

## Deployment Checklist

When deploying with nginx CORS configuration:

- [ ] Verify nginx configuration syntax: `sudo nginx -t`
- [ ] Reload nginx: `sudo systemctl reload nginx`
- [ ] Test CORS with browser DevTools Network tab
- [ ] Verify preflight OPTIONS requests return 204
- [ ] Check that CORS headers are present in responses
- [ ] Confirm credentials (cookies/auth) work if using `Access-Control-Allow-Credentials`
- [ ] Remove `Access-Control-Allow-Origin: *` from production configurations

## Testing CORS Configuration

### Using curl

```bash
# Test preflight request
curl -X OPTIONS https://mpa-dev.badbat75.com/api/health \
  -H "Origin: https://mpa-dev.badbat75.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  -v

# Test actual request
curl -X GET https://mpa-dev.badbat75.com/api/health \
  -H "Origin: https://mpa-dev.badbat75.com" \
  -v
```

### Using Browser DevTools

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Make API request from your frontend
4. Check response headers for:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Methods`
   - `Access-Control-Allow-Headers`

### Expected Response Headers

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://mpa-dev.badbat75.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

## Security Best Practices

1. **Never use `*` in production** - Always specify exact origins
2. **Use HTTPS origins** - Avoid allowing HTTP origins in production
3. **Minimize allowed methods** - Only include methods your API actually uses
4. **Limit allowed headers** - Only whitelist headers your API needs
5. **Use `Access-Control-Max-Age`** - Cache preflight responses to reduce overhead
6. **Log CORS violations** - Monitor for unauthorized access attempts
7. **Regular audits** - Review and update allowed origins periodically

## Troubleshooting

### CORS error in browser but curl works

**Problem:** Browser shows CORS error, but curl requests succeed

**Reason:** CORS is a **browser security feature**. Tools like curl don't enforce CORS.

**Solution:** Check browser DevTools console for specific CORS error, verify nginx CORS headers are present in response.

### Credentials not being sent

**Problem:** Cookies or Authorization headers not sent with request

**Reason:** Missing `Access-Control-Allow-Credentials: true` or using `*` origin

**Solution:**
```nginx
add_header Access-Control-Allow-Origin https://specific-domain.com always;
add_header Access-Control-Allow-Credentials true always;
```

And in frontend JavaScript:
```javascript
fetch('https://api.example.com/endpoint', {
  credentials: 'include'  // Send cookies
});
```

### Preflight requests failing

**Problem:** OPTIONS requests return 404 or wrong status code

**Reason:** nginx not configured to handle OPTIONS requests

**Solution:** Add OPTIONS handling block (see "Handling Preflight Requests" above)

## Migration from Express CORS

This application previously handled CORS in Express using the `cors` npm package. The CORS logic has been moved to nginx for better performance and centralized management.

**What Changed:**
- ❌ Removed: `cors` npm package
- ❌ Removed: `ALLOWED_ORIGINS` environment variable
- ❌ Removed: Express CORS middleware
- ✅ Added: nginx CORS header configuration
- ✅ Added: Comment in code: "CORS is handled by nginx reverse proxy"

**No Breaking Changes:** The API behavior remains the same for clients. Only the implementation location changed.

## References

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Nginx Headers Module](http://nginx.org/en/docs/http/ngx_http_headers_module.html)
- [nginx Map Module](http://nginx.org/en/docs/http/ngx_http_map_module.html)
