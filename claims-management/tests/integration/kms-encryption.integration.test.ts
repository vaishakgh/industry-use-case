/**
 * 21.9 Integration test: KMS encryption at rest verification.
 * _Requirements: 12.1, 12.2_
 */
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetBucketEncryptionCommand } from '@aws-sdk/client-s3';
import { describeIntegration, getTestEnv } from './helpers/env';

describeIntegration('KMS encryption at rest', () => {
  const env = getTestEnv();
  const ddbClient = new DynamoDBClient({ region: env.region });
  const s3Client = new S3Client({ region: env.region });

  it('DynamoDB Claims table has SSE-KMS enabled', async () => {
    const result = await ddbClient.send(new DescribeTableCommand({
      TableName: env.claimsTable,
    }));

    expect(result.Table?.SSEDescription?.SSEType).toBe('KMS');
    expect(result.Table?.SSEDescription?.Status).toBe('ENABLED');
    expect(result.Table?.SSEDescription?.KMSMasterKeyArn).toBeDefined();
  });

  it('DynamoDB AuditLog table has SSE-KMS enabled', async () => {
    const result = await ddbClient.send(new DescribeTableCommand({
      TableName: env.auditTable,
    }));

    expect(result.Table?.SSEDescription?.SSEType).toBe('KMS');
    expect(result.Table?.SSEDescription?.Status).toBe('ENABLED');
  });

  it('S3 photos bucket has default KMS encryption', async () => {
    const result = await s3Client.send(new GetBucketEncryptionCommand({
      Bucket: env.photosBucket,
    }));

    const rules = result.ServerSideEncryptionConfiguration?.Rules ?? [];
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm).toBe('aws:kms');
    expect(rules[0]?.ApplyServerSideEncryptionByDefault?.KMSMasterKeyID).toBeDefined();
  });

  it('S3 documents bucket has default KMS encryption', async () => {
    const result = await s3Client.send(new GetBucketEncryptionCommand({
      Bucket: env.documentsBucket,
    }));

    const rules = result.ServerSideEncryptionConfiguration?.Rules ?? [];
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm).toBe('aws:kms');
  });
});
