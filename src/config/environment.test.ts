import { describe, it, expect } from 'vitest';
import { constructJwksUri } from './environment';

describe('constructJwksUri', () => {
  it('should construct JWKS URI from issuer with trailing slash', () => {
    const issuer = 'https://example.auth0.com/';
    const expected = 'https://example.auth0.com/.well-known/jwks.json';

    expect(constructJwksUri(issuer)).toBe(expected);
  });

  it('should construct JWKS URI from issuer without trailing slash', () => {
    const issuer = 'https://example.auth0.com';
    const expected = 'https://example.auth0.com/.well-known/jwks.json';

    expect(constructJwksUri(issuer)).toBe(expected);
  });

  it('should handle issuer with path', () => {
    const issuer = 'https://example.com/auth0';
    const expected = 'https://example.com/auth0/.well-known/jwks.json';

    expect(constructJwksUri(issuer)).toBe(expected);
  });

  it('should handle issuer with path and trailing slash', () => {
    const issuer = 'https://example.com/auth0/';
    const expected = 'https://example.com/auth0/.well-known/jwks.json';

    expect(constructJwksUri(issuer)).toBe(expected);
  });

  it('should handle HTTP protocol', () => {
    const issuer = 'http://localhost:3000/';
    const expected = 'http://localhost:3000/.well-known/jwks.json';

    expect(constructJwksUri(issuer)).toBe(expected);
  });

  it('should preserve port numbers', () => {
    const issuer = 'https://example.com:8443/';
    const expected = 'https://example.com:8443/.well-known/jwks.json';

    expect(constructJwksUri(issuer)).toBe(expected);
  });

  it('should throw error for invalid URL format', () => {
    const issuer = 'not-a-valid-url';

    expect(() => constructJwksUri(issuer)).toThrow('Invalid issuer URL format');
  });

  it('should throw error for invalid protocol', () => {
    const issuer = 'ftp://example.com/';

    expect(() => constructJwksUri(issuer)).toThrow('Invalid issuer protocol: ftp:');
  });

  it('should throw error for empty string', () => {
    const issuer = '';

    expect(() => constructJwksUri(issuer)).toThrow('Invalid issuer URL format');
  });

  it('should handle complex paths correctly', () => {
    const issuer = 'https://auth.example.com/tenant/subdomain';
    const expected = 'https://auth.example.com/tenant/subdomain/.well-known/jwks.json';

    expect(constructJwksUri(issuer)).toBe(expected);
  });

  it('should handle query parameters in issuer', () => {
    const issuer = 'https://example.com/?tenant=test';
    const expected = 'https://example.com/.well-known/jwks.json?tenant=test';

    expect(constructJwksUri(issuer)).toBe(expected);
  });

  it('should handle URL with fragment', () => {
    const issuer = 'https://example.com/#fragment';
    const expected = 'https://example.com/.well-known/jwks.json#fragment';

    expect(constructJwksUri(issuer)).toBe(expected);
  });
});
