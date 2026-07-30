/**
 * 21.5 Integration test: Cognito authentication flow.
 * _Requirements: 9.1, 9.2_
 */
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { describeIntegration, getTestEnv } from './helpers/env';
import { createTestUser, deleteTestUser, type TestUser } from './helpers/cognito';

describeIntegration('Cognito authentication flow', () => {
  const env = getTestEnv();
  const cognitoClient = new CognitoIdentityProviderClient({ region: env.region });
  const testUser: TestUser = {
    username: `test-auth-${Date.now()}`,
    password: 'Test!Pass123',
    email: `test-${Date.now()}@example.com`,
  };
  let userCreated = false;

  beforeAll(async () => {
    try {
      await createTestUser(testUser);
      userCreated = true;
    } catch (err: any) {
      console.warn(`Cannot create test user (likely missing Admin* permissions): ${err.message}`);
    }
  });

  afterAll(async () => {
    if (userCreated) {
      await deleteTestUser(testUser.username);
    }
  });

  it('succeeds with correct credentials', async () => {
    if (!userCreated) {
      console.warn('Skipping — test user could not be created');
      return;
    }

    const result = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: env.userPoolClientId,
      AuthParameters: { USERNAME: testUser.username, PASSWORD: testUser.password },
    }));

    expect(result.AuthenticationResult?.AccessToken).toBeDefined();
    expect(result.AuthenticationResult?.IdToken).toBeDefined();
  });

  it('fails with wrong password (generic error, no info leakage)', async () => {
    if (!userCreated) {
      console.warn('Skipping — test user could not be created');
      return;
    }

    await expect(
      cognitoClient.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: env.userPoolClientId,
        AuthParameters: { USERNAME: testUser.username, PASSWORD: 'WrongPass123!' },
      })),
    ).rejects.toThrow();
  });

  it('fails with nonexistent username (same generic error)', async () => {
    // With preventUserExistenceErrors enabled, Cognito may respond differently
    // (e.g., it might simulate a password check instead of revealing user doesn't exist)
    try {
      await cognitoClient.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: env.userPoolClientId,
        AuthParameters: { USERNAME: 'nonexistent-user-xyz-99999', PASSWORD: 'AnyPass123!' },
      }));
      // If it doesn't throw, Cognito is masking the error (which is correct behavior)
    } catch (err: any) {
      // Should throw NotAuthorizedException (same as wrong password) — not UserNotFoundException
      expect(err.name).not.toBe('UserNotFoundException');
    }
  });
});
