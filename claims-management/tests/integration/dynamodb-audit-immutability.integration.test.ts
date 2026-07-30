/**
 * 21.3 Integration test: DynamoDB AuditLog immutability.
 * _Requirements: 8.2_
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { describeIntegration, getTestEnv } from './helpers/env';
import { deleteDynamoItem, testId } from './helpers/cleanup';

describeIntegration('DynamoDB AuditLog immutability', () => {
  const env = getTestEnv();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.region }));
  const createdLogIds: Array<{ logId: string; claimId: string }> = [];

  afterAll(async () => {
    for (const key of createdLogIds) {
      await deleteDynamoItem(env.auditTable, key);
    }
  });

  it('PutItem with attribute_not_exists succeeds for new records', async () => {
    const logId = testId();
    const claimId = `claim-${testId()}`;
    createdLogIds.push({ logId, claimId });

    await expect(
      client.send(new PutCommand({
        TableName: env.auditTable,
        Item: { logId, claimId, decisionType: 'Approval', timestamp: new Date().toISOString() },
        ConditionExpression: 'attribute_not_exists(logId)',
      })),
    ).resolves.toBeDefined();
  });

  it('PutItem with attribute_not_exists fails for duplicate logId', async () => {
    const logId = testId();
    const claimId = `claim-${testId()}`;
    createdLogIds.push({ logId, claimId });

    // First write succeeds
    await client.send(new PutCommand({
      TableName: env.auditTable,
      Item: { logId, claimId, decisionType: 'Approval', timestamp: new Date().toISOString() },
      ConditionExpression: 'attribute_not_exists(logId)',
    }));

    // Duplicate write fails with ConditionalCheckFailedException
    await expect(
      client.send(new PutCommand({
        TableName: env.auditTable,
        Item: { logId, claimId, decisionType: 'Denial', timestamp: new Date().toISOString() },
        ConditionExpression: 'attribute_not_exists(logId)',
      })),
    ).rejects.toThrow(/conditional/i);
  });
});
