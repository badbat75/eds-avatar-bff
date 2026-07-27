import { describe, it, expect } from 'vitest';
import { config, validateConfig } from './environment';

describe('validateConfig', () => {
  /** The live config already passes validation; vary only what each case is about */
  const gateConfig = (overrides: Partial<typeof config> = {}) => ({
    ...config,
    host: '127.0.0.1',
    ...overrides,
  });

  it.each(['127.0.0.1', '::1', 'localhost'])('accepts the loopback bind host %s', host => {
    expect(() => validateConfig(gateConfig({ host }))).not.toThrow();
  });

  // The identity header is trusted, so anything that can reach the port can
  // impersonate any user: the reverse proxy must be the only way in.
  it('rejects a bind host reachable from outside this machine', () => {
    expect(() => validateConfig(gateConfig({ host: '0.0.0.0' }))).toThrow(
      /HOST must be loopback/
    );
  });

  it('rejects an empty identity header, which would authenticate nobody', () => {
    expect(() => validateConfig(gateConfig({ gateIdentityHeader: '  ' }))).toThrow(
      /GATE_IDENTITY_HEADER must not be empty/
    );
  });

  it('rejects a port outside the valid range', () => {
    expect(() => validateConfig(gateConfig({ port: 70000 }))).toThrow(
      /PORT must be between 1 and 65535/
    );
  });

  it('rejects a Deepgram token TTL outside the supported window', () => {
    expect(() => validateConfig(gateConfig({ deepgramTokenTtlMinutes: 0 }))).toThrow(
      /DEEPGRAM_TOKEN_TTL_MINUTES must be between 1 and 1440/
    );
  });
});
