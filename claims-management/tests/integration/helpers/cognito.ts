/**
 * Cognito authentication helper for integration tests.
 *
 * Acquires tokens for test users to make authenticated API calls.
 */
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getTestEnv } from './env';

const env = getTestEnv();
const cognitoClient = new CognitoIdentityProviderClient({ region: env.region });

export interface TestUser {
  username: string;
  password: string;
  email: string;
}

/**
 * Authenticates a test user and returns the ID token (for API Gateway authorizer).
 */
export async function authenticateUser(username: string, password: string): Promise<string> {
  const result = await cognitoClient.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: env.userPoolClientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    }),
  );

  // Return ID token (used by Cognito authorizer) rather than access token
  return result.AuthenticationResult?.IdToken ?? '';
}

/**
 * Creates a test user in the Cognito User Pool.
 */
export async function createTestUser(user: TestUser): Promise<void> {
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: env.userPoolId,
      Username: user.username,
      TemporaryPassword: 'Temp!Pass1',
      UserAttributes: [
        { Name: 'email', Value: user.email },
        { Name: 'email_verified', Value: 'true' },
      ],
      MessageAction: 'SUPPRESS',
    }),
  );

  // Set permanent password
  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: env.userPoolId,
      Username: user.username,
      Password: user.password,
      Permanent: true,
    }),
  );
}

/**
 * Deletes a test user from the Cognito User Pool.
 */
export async function deleteTestUser(username: string): Promise<void> {
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: env.userPoolId,
        Username: username,
      }),
    );
  } catch {
    // Ignore if user doesn't exist
  }
}
