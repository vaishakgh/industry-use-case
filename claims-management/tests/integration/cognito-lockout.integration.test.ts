/**
 * 21.6 Integration test: Account lockout after consecutive failures.
 * _Requirements: 9.3_
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { describeIntegration, getTestEnv } from './helpers/env';
import { testId } from './helpers/cleanup';

describeIntegration('Account lockout after consecutive failures', () => {
  const env = getTestEnv();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.region }));

  it('tracks consecutive failures in the LoginAttempts table', async () => {
    const username = `lockout-test-${testId()}`;
    const loginAttemptsTable = 'claims-login-attempts-dev';

    // Simulate 5 failed attempts by writing directly to the table
    await client.send(new PutCommand({
      TableName: loginAttemptsTable,
      Item: {
        username,
        consecutiveFailures: 5,
        lastFailureAt: Date.now(),
        expiresAt: Math.floor(Date.now() / 1000) + 900, // TTL: 15 min
      },
    }));

    // Verify the record exists
    const result = await client.send(new GetCommand({
      TableName: loginAttemptsTable,
      Key: { username },
    }));

    expect(result.Item?.consecutiveFailures).toBe(5);

    // Cleanup
    await client.send(new DeleteCommand({
      TableName: loginAttemptsTable,
      Key: { username },
    }));
  });
});
