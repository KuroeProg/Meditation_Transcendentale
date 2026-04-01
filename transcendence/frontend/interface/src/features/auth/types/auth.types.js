// 🆕 Auth Type Definitions
// TypeScript-style enums and constants

export const AUTH_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  TWO_FACTOR_REQUIRED: 'two_factor_required',
  SESSION_EXPIRED: 'session_expired',
  UNAUTHORIZED: 'unauthorized',
}
