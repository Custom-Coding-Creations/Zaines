import { describe, expect, it } from 'vitest';
import { classifyAuthFailure, getAuthErrorType } from '@/lib/api/auth-error-classification';

describe('auth error classification', () => {
  it('returns invalid_session for JWT/session token failures', () => {
    expect(classifyAuthFailure({ type: 'JWTSessionError' })).toBe('invalid_session');
    expect(classifyAuthFailure({ type: 'SessionTokenError' })).toBe('invalid_session');
  });

  it('returns misconfigured for missing secret failures', () => {
    expect(classifyAuthFailure({ type: 'MissingSecret' })).toBe('misconfigured');
  });

  it('returns unavailable for unknown failures', () => {
    expect(classifyAuthFailure(new Error('boom'))).toBe('unavailable');
    expect(classifyAuthFailure({ type: 'UnknownAuthError' })).toBe('unavailable');
  });

  it('extracts auth error type safely', () => {
    expect(getAuthErrorType({ type: 'JWTSessionError' })).toBe('JWTSessionError');
    expect(getAuthErrorType({})).toBe(null);
    expect(getAuthErrorType(null)).toBe(null);
  });
});
