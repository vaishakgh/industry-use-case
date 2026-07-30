export { AuthClient, AuthTokens, AuthSuccessResult, AuthFailureResult, AuthResult, CognitoAuthClient, CognitoAuthClientOptions, COGNITO_APP_CLIENT_ID, INVALID_CREDENTIALS_MESSAGE, createAuthClient, } from './authClient';
export { checkLockout, recordFailedAttempt, DEFAULT_LOCKOUT_CONFIG } from './lockoutTracking';
export type { LockoutConfig, FailedAttemptRecord, LockoutStore, LockoutCheckResult } from './lockoutTracking';
export { checkSessionTimeout } from './sessionTimeout';
export type { SessionActivity, SessionTimeoutResult } from './sessionTimeout';
//# sourceMappingURL=index.d.ts.map