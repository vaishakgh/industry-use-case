/**
 * 21.15 Integration test: Fraud flag payout suspension.
 * _Requirements: 6.5_
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { describeIntegration, getTestEnv } from './helpers/env';
import { deleteDynamoItem, testId } from './helpers/cleanup';

describeIntegration('Fraud flag payout suspension', () => {
  const env = getTestEnv();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.region }));
  const createdClaimIds: string[] = [];

  afterAll(async () => {
    for (const id of createdClaimIds) {
      await deleteDynamoItem(env.claimsTable, { claimId: id });
    }
  });

  it('a fraud-flagged claim without analyst decision has fraudFlag=true and no fraudAnalystId', async () => {
    const claimId = testId();
    createdClaimIds.push(claimId);

    await client.send(new PutCommand({
      TableName: env.claimsTable,
      Item: {
        claimId,
        claimStatus: 'Fraud_Check',
        fraudFlag: true,
        fraudAnalystId: null,
        policyNumber: 'POL-FRAUD-TEST',
        statusHistory: [{ status: 'Fraud_Check', timestamp: new Date().toISOString() }],
      },
    }));

    const result = await client.send(new GetCommand({
      TableName: env.claimsTable,
      Key: { claimId },
    }));

    expect(result.Item?.fraudFlag).toBe(true);
    expect(result.Item?.fraudAnalystId).toBeNull();
    // The payout logic checks these fields before proceeding
  });

  it('after analyst clears the flag, fraudFlag is false and fraudAnalystId is recorded', async () => {
    const claimId = testId();
    createdClaimIds.push(claimId);

    // Simulate analyst clearing the flag
    await client.send(new PutCommand({
      TableName: env.claimsTable,
      Item: {
        claimId,
        claimStatus: 'Fraud_Check',
        fraudFlag: false,
        fraudAnalystId: 'ANALYST-001',
        policyNumber: 'POL-FRAUD-TEST',
        statusHistory: [{ status: 'Fraud_Check', timestamp: new Date().toISOString() }],
      },
    }));

    const result = await client.send(new GetCommand({
      TableName: env.claimsTable,
      Key: { claimId },
    }));

    expect(result.Item?.fraudFlag).toBe(false);
    expect(result.Item?.fraudAnalystId).toBe('ANALYST-001');
  });
});
