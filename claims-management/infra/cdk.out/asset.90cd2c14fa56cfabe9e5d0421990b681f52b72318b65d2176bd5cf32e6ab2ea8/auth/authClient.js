"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoAuthClient = exports.INVALID_CREDENTIALS_MESSAGE = exports.COGNITO_APP_CLIENT_ID = void 0;
exports.createAuthClient = createAuthClient;
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
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
/** Cognito User Pool App Client id, overridable via environment variable. */
exports.COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID ?? '';
/**
 * The single, generic, non-leaking error message surfaced for every
 * authentication failure, regardless of whether the username or the
 * password was the incorrect element (Req 9.2). This exact string must be
 * returned for both a wrong password and a nonexistent username -- never
 * a different message for either case.
 */
exports.INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password.';
/**
 * `AuthClient` implementation backed by Amazon Cognito's `InitiateAuth`
 * API (`USER_PASSWORD_AUTH` flow).
 */
class CognitoAuthClient {
    cognitoClient;
    appClientId;
    constructor(cognitoClient, options = {}) {
        this.cognitoClient = cognitoClient;
        this.appClientId = options.appClientId ?? exports.COGNITO_APP_CLIENT_ID;
    }
    async authenticate(username, password) {
        let response;
        try {
            response = await this.cognitoClient.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: this.appClientId,
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password,
                },
            }));
        }
        catch {
            // Every Cognito rejection -- wrong password, unknown username,
            // unconfirmed user, throttling, etc. -- collapses to the same
            // generic result. The specific Cognito error code/message is
            // intentionally discarded here so it can never leak to the caller.
            return { success: false, message: exports.INVALID_CREDENTIALS_MESSAGE };
        }
        const authenticationResult = response.AuthenticationResult;
        if (!authenticationResult?.IdToken ||
            !authenticationResult?.AccessToken ||
            authenticationResult?.ExpiresIn === undefined) {
            // Cognito responded without a completed AuthenticationResult (e.g. it
            // returned a challenge instead, such as NEW_PASSWORD_REQUIRED). This
            // is not a completed login, so it is treated as an authentication
            // failure with the same generic message rather than exposing the
            // challenge details.
            return { success: false, message: exports.INVALID_CREDENTIALS_MESSAGE };
        }
        return {
            success: true,
            tokens: {
                idToken: authenticationResult.IdToken,
                accessToken: authenticationResult.AccessToken,
                refreshToken: authenticationResult.RefreshToken,
                expiresIn: authenticationResult.ExpiresIn,
            },
        };
    }
}
exports.CognitoAuthClient = CognitoAuthClient;
/**
 * Convenience factory that constructs a `CognitoAuthClient` from a
 * low-level `CognitoIdentityProviderClient`. Production Lambda handlers
 * use this; tests instead construct `CognitoAuthClient` directly with a
 * mocked `CognitoIdentityProviderClient`.
 */
function createAuthClient(client = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({}), options) {
    return new CognitoAuthClient(client, options);
}
//# sourceMappingURL=authClient.js.map