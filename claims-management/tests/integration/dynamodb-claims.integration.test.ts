/**
 * 21.2 Integration test: DynamoDB Claims table CRUD and status history append.
 * _Requirements: 7.6_
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { describeIntegration, getTestEnv } from './helpers/env';
import { deleteDynamoItem, testId } from './helpers/cleanup';

describeIntegration('DynamoDB Claims table CRUD and statusHistory', () => {
  const env = getTestEnv();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.region }));
  const createdClaimIds: string[] = [];

  afterAll(async () => {
    for (const id of createdClaimIds) {
      await deleteDynamoItem(env.claimsTable, { claimId: id });
    }
  });

  it('putClaim writes a full item retrievable by getClaim', async () => {
    const claimId = testId();
    createdClaimIds.push(claimId);

    await client.send(new PutCommand({
      TableName: env.claimsTable,
      Item: { claimId, claimStatus: 'Intake', statusHistory: [], policyNumber: 'POL-TEST' },
    }));

    const result = await client.send(new GetCommand({
      TableName: env.claimsTable,
      Key: { claimId },
    }));

    expect(result.Item).toBeDefined();
    expect(result.Item?.claimId).toBe(claimId);
    expect(result.Item?.claimStatus).toBe('Intake');
  });

  it('appendStatusHistory atomically adds entries in order', async () => {
    const claimId = testId();
    createdClaimIds.push(claimId);

    // Create claim with empty history
    await client.send(new PutCommand({
      TableName: env.claimsTable,
      Item: { claimId, claimStatus: 'Intake', statusHistory: [] },
    }));

    // Append 3 transitions
    const transitions = ['Assessment', 'Fraud_Check', 'Approved'];
    for (const status of transitions) {
      await client.send(new UpdateCommand({
        TableName: env.claimsTable,
        Key: { claimId },
        UpdateExpression: 'SET #sh = list_append(if_not_exists(#sh, :empty), :entry)',
        ExpressionAttributeNames: { '#sh': 'statusHistory' },
        ExpressionAttributeValues: {
          ':empty': [],
          ':entry': [{ status, timestamp: new Date().toISOString() }],
        },
      }));
    }

    const result = await client.send(new GetCommand({
      TableName: env.claimsTable,
      Key: { claimId },
    }));

    const history = result.Item?.statusHistory as Array<{ status: string }>;
    expect(history).toHaveLength(3);
    expect(history.map((h) => h.status)).toEqual(transitions);
  });
});
