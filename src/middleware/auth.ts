import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';
import { AuthenticatedUser } from '../types';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/**
 * Reads a header the gate sets at most once.
 * Node lowercases incoming header names; an array would mean a duplicate.
 */
function readHeader(req: Request, name: string): string | undefined {
  const raw = req.headers[name];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() || undefined;
}

/**
 * Decodes a name the gate percent-encoded.
 *
 * Header field values are not UTF-8, so the gate escapes them ("De%20Simoni"). A
 * malformed sequence must not cost the caller its identity — the request is already
 * authenticated by the time we get here, and a name is only ever cosmetic — so an
 * undecodable value is passed through exactly as it arrived.
 */
function decodeGateName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).trim() || undefined;
  } catch {
    return value;
  }
}

/**
 * Authenticates a request already vetted by the bb-auth reverse-proxy gate.
 *
 * The gate answers nginx's `auth_request` and returns the authorized email plus,
 * when the id token carries them, the user's names. nginx injects them with
 * `proxy_set_header` — overwriting whatever the client sent, and omitting a header
 * entirely when the gate returned no value. There is no token to verify here: the
 * proxy is the authentication, which is why the service refuses to bind anywhere but
 * loopback (see validateConfig).
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  // The email is the credential; it arrives unencoded and its absence is fatal
  const email = readHeader(req, config.gateIdentityHeader);

  if (!email) {
    res.status(401).json({
      error: 'Unauthorized',
      message: `Missing ${config.gateIdentityHeader} identity header`,
    });
    return;
  }

  // The gate issues no subject claim, so the email is also what the rest of the
  // service keys on. The names are optional decoration and never gate access.
  req.user = {
    sub: email,
    email,
    iss: 'bb-auth-gate',
    givenName: decodeGateName(readHeader(req, config.gateGivenNameHeader)),
    familyName: decodeGateName(readHeader(req, config.gateFamilyNameHeader)),
  };
  next();
}
