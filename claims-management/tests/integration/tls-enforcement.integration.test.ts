/**
 * 21.10 Integration test: TLS in transit enforcement.
 * _Requirements: 12.2_
 */
import { S3Client, GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import { describeIntegration, getTestEnv } from './helpers/env';

describeIntegration('TLS in transit enforcement', () => {
  const env = getTestEnv();
  const s3Client = new S3Client({ region: env.region });

  it('S3 photos bucket policy denies non-HTTPS access', async () => {
    const result = await s3Client.send(new GetBucketPolicyCommand({
      Bucket: env.photosBucket,
    }));

    const policy = JSON.parse(result.Policy ?? '{}');
    const statements = policy.Statement ?? [];
    const hasTlsDeny = statements.some((stmt: any) =>
      stmt.Effect === 'Deny' &&
      stmt.Condition?.Bool?.['aws:SecureTransport'] === 'false',
    );

    expect(hasTlsDeny).toBe(true);
  });

  it('S3 documents bucket policy denies non-HTTPS access', async () => {
    const result = await s3Client.send(new GetBucketPolicyCommand({
      Bucket: env.documentsBucket,
    }));

    const policy = JSON.parse(result.Policy ?? '{}');
    const statements = policy.Statement ?? [];
    const hasTlsDeny = statements.some((stmt: any) =>
      stmt.Effect === 'Deny' &&
      stmt.Condition?.Bool?.['aws:SecureTransport'] === 'false',
    );

    expect(hasTlsDeny).toBe(true);
  });

  it('API Gateway endpoint uses HTTPS', () => {
    expect(env.apiUrl).toMatch(/^https:\/\//);
  });
});
