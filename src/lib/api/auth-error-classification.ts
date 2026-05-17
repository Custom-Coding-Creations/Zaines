export type AuthFailureKind = 'invalid_session' | 'misconfigured' | 'unavailable';

export function getAuthErrorType(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('type' in error)) {
    return null;
  }

  return typeof error.type === 'string' ? error.type : null;
}

export function classifyAuthFailure(error: unknown): AuthFailureKind {
  const authErrorType = getAuthErrorType(error);

  if (authErrorType === 'JWTSessionError' || authErrorType === 'SessionTokenError') {
    return 'invalid_session';
  }

  if (authErrorType === 'MissingSecret') {
    return 'misconfigured';
  }

  return 'unavailable';
}
