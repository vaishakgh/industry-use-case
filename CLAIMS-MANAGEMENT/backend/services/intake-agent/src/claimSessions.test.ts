import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type { ClaimSession } from '@claims/shared';
import {
  DEFAULT_CLAIM_SESSIONS_TABLE_NAME,
  DynamoClaimSessionsTable,
  POLICY_NUMBER_STATUS_INDEX_NAME,
} from './claimSessions';

function buildSession(overrides: Partial<ClaimSession> = {}): ClaimSession {
  return {
    claimId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    policyNumber: 'POL-123',
    claimStatus: 'Intake',
    channelHistory: [{ channel: 'Chat', timestamp: '2024-01-01T00:00:00.000Z' }],
    fieldAttemptCounts: {},
    voiceRetryCount: 0,
    confirmAttemptCounts: {},
    expiresAt: 1234567890,
    ...overrides,
  };
}

describe('DynamoClaimSessionsTable', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  function buildTable(): DynamoClaimSessionsTable {
    // `mockClient` wraps `DynamoDBDocumentClient` and satisfies its shape,
    // so it can stand in for a real client via the `documentClient` option.
    return new DynamoClaimSessionsTable({ documentClient: ddbMock as unknown as DynamoDBDocumentClient });
  }

  describe('getClaimSession', () => {
    it('returns the session item when it exists', async () => {
      const session = buildSession();
      ddbMock.on(GetCommand).resolves({ Item: session });

      const table = buildTable();
      const result = await table.getClaimSession(session.claimId);

      expect(result).toEqual(session);
      expect(ddbMock.commandCalls(GetCommand)[0]?.args[0].input).toEqual({
        TableName: DEFAULT_CLAIM_SESSIONS_TABLE_NAME,
        Key: { claimId: session.claimId },
      });
    });

    it('returns undefined when no session exists for the claimId', async () => {
      ddbMock.on(GetCommand).resolves({});

      const table = buildTable();
      const result = await table.getClaimSession('nonexistent-claim-id');

      expect(result).toBeUndefined();
    });
  });

  describe('putClaimSession', () => {
    it('writes the session item to the table', async () => {
      ddbMock.on(PutCommand).resolves({});
      const session = buildSession();

      const table = buildTable();
      await table.putClaimSession(session);

      expect(ddbMock.commandCalls(PutCommand)[0]?.args[0].input).toEqual({
        TableName: DEFAULT_CLAIM_SESSIONS_TABLE_NAME,
        Item: session,
      });
    });
  });

  describe('get/put round-trip', () => {
    it('returns the exact session that was put, via a shared in-memory-backed mock', async () => {
      const session = buildSession({ policyNumber: 'POL-999', claimStatus: 'Intake' });

      ddbMock.on(PutCommand).callsFake(() => {
        return {};
      });
      ddbMock.on(GetCommand).resolves({ Item: session });

      const table = buildTable();
      await table.putClaimSession(session);
      const fetched = await table.getClaimSession(session.claimId);

      expect(fetched).toEqual(session);
    });
  });

  describe('updateClaimSession', () => {
    it('builds an UpdateExpression from the given fields and returns the updated attributes', async () => {
      const updated = buildSession({ claimStatus: 'Assessment', voiceRetryCount: 2 });
      ddbMock.on(UpdateCommand).resolves({ Attributes: updated });

      const table = buildTable();
      const result = await table.updateClaimSession(updated.claimId, {
        claimStatus: 'Assessment',
        voiceRetryCount: 2,
      });

      expect(result).toEqual(updated);
      const call = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
      expect(call?.TableName).toBe(DEFAULT_CLAIM_SESSIONS_TABLE_NAME);
      expect(call?.Key).toEqual({ claimId: updated.claimId });
      expect(call?.UpdateExpression).toBe('SET #f0 = :v0, #f1 = :v1');
      expect(call?.ExpressionAttributeNames).toEqual({ '#f0': 'claimStatus', '#f1': 'voiceRetryCount' });
      expect(call?.ExpressionAttributeValues).toEqual({ ':v0': 'Assessment', ':v1': 2 });
    });

    it('throws when called with no fields to update', async () => {
      const table = buildTable();
      await expect(table.updateClaimSession('some-claim-id', {})).rejects.toThrow(
        'updateClaimSession requires at least one field to update',
      );
    });
  });

  describe('queryByPolicyNumberAndStatus (PolicyNumberStatusIndex GSI)', () => {
    it('returns zero results when no sessions match', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const table = buildTable();
      const result = await table.queryByPolicyNumberAndStatus('POL-000', 'Intake');

      expect(result).toEqual([]);
    });

    it('returns exactly one result when a single session matches', async () => {
      const session = buildSession({ policyNumber: 'POL-123', claimStatus: 'Intake' });
      ddbMock.on(QueryCommand).resolves({ Items: [session] });

      const table = buildTable();
      const result = await table.queryByPolicyNumberAndStatus('POL-123', 'Intake');

      expect(result).toEqual([session]);
      const call = ddbMock.commandCalls(QueryCommand)[0]?.args[0].input;
      expect(call?.TableName).toBe(DEFAULT_CLAIM_SESSIONS_TABLE_NAME);
      expect(call?.IndexName).toBe(POLICY_NUMBER_STATUS_INDEX_NAME);
      expect(call?.KeyConditionExpression).toBe('policyNumber = :policyNumber AND claimStatus = :claimStatus');
      expect(call?.ExpressionAttributeValues).toEqual({
        ':policyNumber': 'POL-123',
        ':claimStatus': 'Intake',
      });
    });

    it('returns many results when multiple sessions match (ambiguous match scenario)', async () => {
      const sessionA = buildSession({ claimId: 'claim-a', policyNumber: 'POL-123', claimStatus: 'Intake' });
      const sessionB = buildSession({ claimId: 'claim-b', policyNumber: 'POL-123', claimStatus: 'Intake' });
      ddbMock.on(QueryCommand).resolves({ Items: [sessionA, sessionB] });

      const table = buildTable();
      const result = await table.queryByPolicyNumberAndStatus('POL-123', 'Intake');

      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([sessionA, sessionB]));
    });
  });
});
