/**
 * Cleanup utilities for integration tests.
 *
 * Removes test data from DynamoDB tables and S3 buckets after tests run.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getTestEnv } from './env';

const env = getTestEnv();
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.region }));
const s3Client = new S3Client({ region: env.region });

/**
 * Deletes a DynamoDB item by table name and key.
 */
export async function deleteDynamoItem(
  tableName: string,
  key: Record<string, string>,
): Promise<void> {
  await ddbClient.send(new DeleteCommand({ TableName: tableName, Key: key }));
}

/**
 * Deletes an S3 object by bucket and key.
 */
export async function deleteS3Object(bucket: string, key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Generates a unique test ID for isolation.
 */
export function testId(): string {
  return `integ-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
