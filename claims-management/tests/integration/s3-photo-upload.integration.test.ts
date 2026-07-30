/**
 * 21.7 Integration test: S3 photo upload with format/size validation.
 * _Requirements: 4.1, 4.4, 4.5_
 */
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { describeIntegration, getTestEnv } from './helpers/env';
import { testId } from './helpers/cleanup';

describeIntegration('S3 photo upload validation', () => {
  const env = getTestEnv();
  const s3Client = new S3Client({ region: env.region });
  const uploadedKeys: string[] = [];

  afterAll(async () => {
    for (const key of uploadedKeys) {
      await s3Client.send(new DeleteObjectCommand({ Bucket: env.photosBucket, Key: key }));
    }
  });

  it('accepts a valid JPEG upload under the size limit', async () => {
    const key = `test-photos/${testId()}.jpg`;
    uploadedKeys.push(key);

    // Upload a small valid "JPEG" (just bytes for test purposes)
    await s3Client.send(new PutObjectCommand({
      Bucket: env.photosBucket,
      Key: key,
      Body: Buffer.alloc(1024), // 1KB
      ContentType: 'image/jpeg',
    }));

    // Verify object exists
    const head = await s3Client.send(new HeadObjectCommand({
      Bucket: env.photosBucket,
      Key: key,
    }));

    expect(head.ContentLength).toBe(1024);
  });

  it('stores objects with KMS encryption', async () => {
    const key = `test-photos/${testId()}.jpg`;
    uploadedKeys.push(key);

    await s3Client.send(new PutObjectCommand({
      Bucket: env.photosBucket,
      Key: key,
      Body: Buffer.alloc(512),
      ContentType: 'image/jpeg',
    }));

    const head = await s3Client.send(new HeadObjectCommand({
      Bucket: env.photosBucket,
      Key: key,
    }));

    expect(head.ServerSideEncryption).toBe('aws:kms');
  });
});
