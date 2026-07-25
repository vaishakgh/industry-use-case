import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type { AuditLogRecord } from '@claims/shared';
import {
  AUDIT_LOG_TABLE_NAME,
  AuditLogAccessError,
  AuditLogDuplicateRecordError,
  CLAIM_ID_INDEX_NAME,
  DynamoDbAuditLogRepository,
} from './auditLogRepository';

function buildRecord(overrides: Partial<AuditLogRecord> = {}): AuditLogRecord {
  return {
    logId: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
    claimId: 'claim-1',
    decisionType: 'Approval',
    inputs: { severityRating: 'Low' },
    confidenceScore: 0.9,
    fraudIndicators: null,
    timestamp: '2024-01-01T00:00:00.000Z',
    actorType: 'System',
    actorId: null,
    ...overrides,
  };
}

describe('DynamoDbAuditLogRepository', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  describe('putAuditLogRecord', () => {
    it('successfully appends a record via a conditional PutItem', async () => {
      ddbMock.on(PutCommand).resolves({});
      const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);
      const record = buildRecord();

      await expect(repository.putAuditLogRecord(record)).resolves.toBeUndefined();

      expect(ddbMock.calls()).toHaveLength(1);
      const call = ddbMock.call(0);
      expect(call.args[0].input).toEqual({
        TableName: AUDIT_LOG_TABLE_NAME,
        Item: record,
        ConditionExpression: 'attribute_not_exists(logId)',
      });
    });

    it('throws AuditLogDuplicateRecordError on a duplicate-key conditional failure', async () => {
      const conditionalError = Object.assign(new Error('The conditional request failed'), {
        name: 'ConditionalCheckFailedException',
      });
      ddbMock.on(PutCommand).rejects(conditionalError);
      const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);
      const record = buildRecord();

      await expect(repository.putAuditLogRecord(record)).rejects.toBeInstanceOf(AuditLogDuplicateRecordError);
      await expect(repository.putAuditLogRecord(record)).rejects.toMatchObject({ logId: record.logId });
    });

    it('throws AuditLogAccessError (not AuditLogDuplicateRecordError) on a genuine write failure', async () => {
      const throttlingError = Object.assign(new Error('Rate exceeded'), {
        name: 'ProvisionedThroughputExceededException',
      });
      ddbMock.on(PutCommand).rejects(throttlingError);
      const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await expect(repository.putAuditLogRecord(buildRecord())).rejects.toBeInstanceOf(AuditLogAccessError);
      await expect(repository.putAuditLogRecord(buildRecord())).rejects.not.toBeInstanceOf(
        AuditLogDuplicateRecordError,
      );
    });
  });

  describe('queryAuditLogByClaimId', () => {
    it('returns records from the ClaimIdIndex GSI in chronological (ascending) order', async () => {
      const records = [
        buildRecord({ logId: '01A', timestamp: '2024-01-01T00:00:00.000Z' }),
        buildRecord({ logId: '01B', timestamp: '2024-01-02T00:00:00.000Z' }),
      ];
      ddbMock.on(QueryCommand).resolves({ Items: records });
      const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

      const result = await repository.queryAuditLogByClaimId('claim-1');

      expect(result).toEqual(records);
      expect(ddbMock.calls()).toHaveLength(1);
      const call = ddbMock.call(0);
      expect(call.args[0].input).toMatchObject({
        TableName: AUDIT_LOG_TABLE_NAME,
        IndexName: CLAIM_ID_INDEX_NAME,
        KeyConditionExpression: 'claimId = :claimId',
        ExpressionAttributeValues: { ':claimId': 'claim-1' },
        ScanIndexForward: true,
      });
    });

    it('returns an empty array when no records exist for the claim', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

      const result = await repository.queryAuditLogByClaimId('claim-with-no-history');

      expect(result).toEqual([]);
    });

    it('paginates through multiple pages and preserves order', async () => {
      const page1 = [buildRecord({ logId: '01A' })];
      const page2 = [buildRecord({ logId: '01B' })];
      ddbMock
        .on(QueryCommand)
        .resolvesOnce({ Items: page1, LastEvaluatedKey: { logId: '01A', claimId: 'claim-1' } })
        .resolvesOnce({ Items: page2 });
      const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

      const result = await repository.queryAuditLogByClaimId('claim-1');

      expect(result).toEqual([...page1, ...page2]);
      expect(ddbMock.calls()).toHaveLength(2);
    });

    it('throws AuditLogAccessError when the query fails', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('Network error'));
      const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await expect(repository.queryAuditLogByClaimId('claim-1')).rejects.toBeInstanceOf(AuditLogAccessError);
    });
  });
});
