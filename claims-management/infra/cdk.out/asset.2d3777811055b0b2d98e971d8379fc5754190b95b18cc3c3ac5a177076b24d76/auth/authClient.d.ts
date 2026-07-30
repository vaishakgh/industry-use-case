/**
 * Cognito authentication integration for the Customer Portal.
 *
 * Wraps Amazon Cognito's `InitiateAuth` (USER_PASSWORD_AUTH flow) behind
 * the `AuthClient` interface so the Portal API can authenticate a customer
 * without ever surfacing *which* part of their credentials was wrong (Req
 * 9.1, 9.2).
 *
 * Per the design's Customer Portal auth notes: "Generic invalid-credential
 * error message (no username/password distinction) surfaced by the
 * frontend regardless of the underlying Cognito error code." Every
 * Cognito authentication failure -- `NotAuthorizedException` (wrong
 * password), `UserNotFoundException` (unknown username),
 * `UserNotConfirmedException`, `PasswordResetRequiredException`,
 * `TooManyRequestsException`, or any other rejection -- is mapped to the
 * exact same `INVALID_CREDENTIALS_MESSAGE`. Callers (and tests) must never
 * be able to distinguish the failure reason from the returned result.
 *
 * The Cognito client is injected behind `AuthClient` so tests can supply a
 * mocked `CognitoIdentityProviderClient` (e.g. via `aws-sdk-client-mock`)
 * without live AWS credentials.
 *
 * _Requirements: 9.1, 9.2_
 */
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
/** Cognito User Pool App Client id, overridable via environment variable. */
export declare const COGNITO_APP_CLIENT_ID: string;
/**
 * The single, generic, non-leaking error message surfaced for every
 * authentication failure, regardless of whether the username or the
 * password was the incorrect element (Req 9.2). This exact string must be
 * returned for both a wrong password and a nonexistent username -- never
 * a different message for either case.
 */
export declare const INVALID_CREDENTIALS_MESSAGE = "Invalid username or password.";
/** Tokens issued by Cognito on successful authentication. */
export interface AuthTokens {
    idToken: string;
    accessToken: string;
    refreshToken?: string;
    /** Access/id token lifetime in seconds, as reported by Cognito. */
    expiresIn: number;
}
export interface AuthSuccessResult {
    success: true;
    tokens: AuthTokens;
}
export interface AuthFailureResult {
    success: false;
    /** Always `INVALID_CREDENTIALS_MESSAGE` -- see module docs. */
    message: string;
}
export type AuthResult = AuthSuccessResult | AuthFailureResult;
/**
 * Authenticates a customer against the Customer Portal's identity
 * provider. Implementations must never distinguish, in either the return
 * value or any side channel (e.g. thrown errors), whether a failed
 * authentication was due to an incorrect username or an incorrect
 * password (Req 9.2).
 */
export interface AuthClient {
    authenticate(username: string, password: string): Promise<AuthResult>;
}
export interface CognitoAuthClientOptions {
    /** Cognito User Pool App Client id. Defaults to `COGNITO_APP_CLIENT_ID`. */
    appClientId?: string;
}
/**
 * `AuthClient` implementation backed by Amazon Cognito's `InitiateAuth`
 * API (`USER_PASSWORD_AUTH` flow).
 */
export declare class CognitoAuthClient implements AuthClient {
    private readonly cognitoClient;
    private readonly appClientId;
    constructor(cognitoClient: CognitoIdentityProviderClient, options?: CognitoAuthClientOptions);
    authenticate(username: string, password: string): Promise<AuthResult>;
}
/**
 * Convenience factory that constructs a `CognitoAuthClient` from a
 * low-level `CognitoIdentityProviderClient`. Production Lambda handlers
 * use this; tests instead construct `CognitoAuthClient` directly with a
 * mocked `CognitoIdentityProviderClient`.
 */
export declare function createAuthClient(client?: CognitoIdentityProviderClient, options?: CognitoAuthClientOptions): CognitoAuthClient;
//# sourceMappingURL=authClient.d.ts.map