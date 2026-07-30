/**
 * 21.4 Integration test: ClaimSessions GSI query (PolicyNumberStatusIndex).
 * _Requirements: 3.1, 3.5_
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { describeIntegration, getTestEnv } from './helpers/env';
import { deleteDynamoItem, testId } from './helpers/cleanup';

describeIntegration('ClaimSessions PolicyNumberStatusIndex GSI', () => {
  const env = getTestEnv();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.region }));
  const createdSessionIds: string[] = [];

  afterAll(async () => {
    for (const id of createdSessionIds) {
      await deleteDynamoItem(env.sessionsTable, { claimId: id });
    }
  });

  it('returns only Intake-status sessions for a given policy number', async () => {
    const policyNumber = `POL-${testId()}`;

    // Create sessions with different statuses
    const sessions = [
      { claimId: testId(), policyNumber, claimStatus: 'Intake' },
      { claimId: testId(), policyNumber, claimStatus: 'Assessment' },
      { claimId: testId(), policyNumber, claimStatus: 'Intake' },
    ];

    for (const session of sessions) {
      createdSessionIds.push(session.claimId);
      await client.send(new PutCommand({
        TableName: env.sessionsTable,
        Item: { ...session, expiresAt: Math.floor(Date.now() / 1000) + 3600 },
      }));
    }

    // Wait a moment for GSI propagation
    await new Promise((r) => setTimeout(r, 2000));

    // Query GSI for Intake sessions only
    const result = await client.send(new QueryCommand({
      TableName: env.sessionsTable,
      IndexName: 'PolicyNumberStatusIndex',
      KeyConditionExpression: 'policyNumber = :pn AND claimStatus = :st',
      ExpressionAttributeValues: { ':pn': policyNumber, ':st': 'Intake' },
    }));

    expect(result.Items?.length).toBe(2);
    expect(result.Items?.every((item) => item.claimStatus === 'Intake')).toBe(true);
  });
});
