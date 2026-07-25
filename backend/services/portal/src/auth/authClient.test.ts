import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { mockClient } from 'aws-sdk-client-mock';
import { CognitoAuthClient, INVALID_CREDENTIALS_MESSAGE } from './authClient';

describe('CognitoAuthClient', () => {
  const cognitoMock = mockClient(CognitoIdentityProviderClient);

  beforeEach(() => {
    cognitoMock.reset();
  });

  it('returns a success result with tokens on successful authentication', async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        IdToken: 'id-token-value',
        AccessToken: 'access-token-value',
        RefreshToken: 'refresh-token-value',
        ExpiresIn: 3600,
      },
    });
    const client = new CognitoAuthClient(cognitoMock as unknown as CognitoIdentityProviderClient, {
      appClientId: 'test-client-id',
    });

    const result = await client.authenticate('alice', 'correct-password');

    expect(result).toEqual({
      success: true,
      tokens: {
        idToken: 'id-token-value',
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
        expiresIn: 3600,
      },
    });
    const call = cognitoMock.call(0);
    expect(call.args[0].input).toEqual({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: 'test-client-id',
      AuthParameters: { USERNAME: 'alice', PASSWORD: 'correct-password' },
    });
  });

  it('returns the generic invalid-credentials message when the password is wrong', async () => {
    cognitoMock
      .on(InitiateAuthCommand)
      .rejects(new NotAuthorizedException({ message: 'Incorrect username or password.', $metadata: {} }));
    const client = new CognitoAuthClient(cognitoMock as unknown as CognitoIdentityProviderClient, {
      appClientId: 'test-client-id',
    });

    const result = await client.authenticate('alice', 'wrong-password');

    expect(result).toEqual({ success: false, message: INVALID_CREDENTIALS_MESSAGE });
  });

  it('returns the exact same generic message when the username does not exist', async () => {
    cognitoMock
      .on(InitiateAuthCommand)
      .rejects(new UserNotFoundException({ message: 'User does not exist.', $metadata: {} }));
    const client = new CognitoAuthClient(cognitoMock as unknown as CognitoIdentityProviderClient, {
      appClientId: 'test-client-id',
    });

    const result = await client.authenticate('nonexistent-user', 'any-password');

    expect(result).toEqual({ success: false, message: INVALID_CREDENTIALS_MESSAGE });
  });

  it('returns an identical error message string for a wrong password and a nonexistent username (Req 9.2)', async () => {
    cognitoMock
      .on(InitiateAuthCommand)
      .rejectsOnce(new NotAuthorizedException({ message: 'Incorrect username or password.', $metadata: {} }))
      .rejectsOnce(new UserNotFoundException({ message: 'User does not exist.', $metadata: {} }));
    const client = new CognitoAuthClient(cognitoMock as unknown as CognitoIdentityProviderClient, {
      appClientId: 'test-client-id',
    });

    const wrongPasswordResult = await client.authenticate('alice', 'wrong-password');
    const unknownUserResult = await client.authenticate('nonexistent-user', 'any-password');

    expect(wrongPasswordResult.success).toBe(false);
    expect(unknownUserResult.success).toBe(false);
    // The core Req 9.2 guarantee: the message text must be identical
    // regardless of which credential element was incorrect, so a caller
    // (or an attacker probing the API) cannot distinguish the two cases.
    expect((wrongPasswordResult as { message: string }).message).toBe(
      (unknownUserResult as { message: string }).message,
    );
  });

  it('returns the generic message for any other Cognito rejection (e.g. throttling)', async () => {
    cognitoMock.on(InitiateAuthCommand).rejects(new Error('Rate exceeded'));
    const client = new CognitoAuthClient(cognitoMock as unknown as CognitoIdentityProviderClient, {
      appClientId: 'test-client-id',
    });

    const result = await client.authenticate('alice', 'some-password');

    expect(result).toEqual({ success: false, message: INVALID_CREDENTIALS_MESSAGE });
  });

  it('returns the generic message when Cognito responds with a challenge instead of tokens', async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: 'some-session-token',
    });
    const client = new CognitoAuthClient(cognitoMock as unknown as CognitoIdentityProviderClient, {
      appClientId: 'test-client-id',
    });

    const result = await client.authenticate('alice', 'temp-password');

    expect(result).toEqual({ success: false, message: INVALID_CREDENTIALS_MESSAGE });
  });
});
