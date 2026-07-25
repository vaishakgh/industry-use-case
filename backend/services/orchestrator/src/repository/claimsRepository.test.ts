import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type { Claim, StatusHistoryEntry } from '@claims/shared';
import { CLAIMS_TABLE_NAME, ClaimsAccessError, DynamoDbClaimsRepository } from './claimsRepository';

function buildClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    claimId: 'claim-1',
    policyNumber: 'POL-1',
    claimStatus: 'Intake',
    structuredFields: {
      policyNumber: { value: 'POL-1', confidenceScore: 0.9, confirmed: true },
      incidentDate: { value: '2024-01-01', confidenceScore: 0.9, confirmed: true },
      incidentLocation: { value: 'Main St', confidenceScore: 0.9, confirmed: true },
      damageDescription: { value: 'Dented bumper', confidenceScore: 0.9, confirmed: true },
    },
    originalChannel: 'Chat',
    photoRefs: [],
    documentRefs: [],
    severityRating: null,
    estimatedRepairCost: null,
    damageAssessmentConfidence: null,
    photoResubmissionCount: 0,
    fraudFlag: false,
    fraudIndicators: [],
    statusHistory: [],
    adjusterId: null,
    fraudAnalystId: null,
    dispute: null,
    policyholderIds: ['customer-1'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('DynamoDbClaimsRepository', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  describe('getClaim', () => {
    it('returns the claim when it exists', async () => {
      const claim = buildClaim();
      ddbMock.on(GetCommand).resolves({ Item: claim });
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      const result = await repository.getClaim('claim-1');

      expect(result).toEqual(claim);
      const call = ddbMock.call(0);
      expect(call.args[0].input).toEqual({
        TableName: CLAIMS_TABLE_NAME,
        Key: { claimId: 'claim-1' },
      });
    });

    it('returns null when no item exists for the claimId', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      const result = await repository.getClaim('missing-claim');

      expect(result).toBeNull();
    });

    it('throws ClaimsAccessError when the read fails', async () => {
      ddbMock.on(GetCommand).rejects(new Error('Network error'));
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await expect(repository.getClaim('claim-1')).rejects.toBeInstanceOf(ClaimsAccessError);
    });
  });

  describe('putClaim', () => {
    it('writes the full claim item', async () => {
      ddbMock.on(PutCommand).resolves({});
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);
      const claim = buildClaim();

      await expect(repository.putClaim(claim)).resolves.toBeUndefined();

      const call = ddbMock.call(0);
      expect(call.args[0].input).toEqual({
        TableName: CLAIMS_TABLE_NAME,
        Item: claim,
      });
    });

    it('throws ClaimsAccessError when the write fails', async () => {
      ddbMock.on(PutCommand).rejects(new Error('Throughput exceeded'));
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await expect(repository.putClaim(buildClaim())).rejects.toBeInstanceOf(ClaimsAccessError);
    });
  });

  describe('get/put/update round-trip', () => {
    it('reflects an update applied after a put, as observed through a subsequent get', async () => {
      const claim = buildClaim();
      let stored: Claim = claim;

      ddbMock.on(PutCommand).callsFake((input) => {
        stored = input.Item as Claim;
        return {};
      });
      ddbMock.on(UpdateCommand).callsFake((input) => {
        const names = (input.ExpressionAttributeNames ?? {}) as Record<string, string>;
        const values = (input.ExpressionAttributeValues ?? {}) as Record<string, unknown>;
        for (const [nameToken, field] of Object.entries(names)) {
          const valueToken = nameToken.replace('#f', ':v');
          if (valueToken in values) {
            (stored as unknown as Record<string, unknown>)[field] = values[valueToken];
          }
        }
        return {};
      });
      ddbMock.on(GetCommand).callsFake(() => ({ Item: stored }));

      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await repository.putClaim(claim);
      await repository.updateClaim('claim-1', { claimStatus: 'Assessment', estimatedRepairCost: 1500 });
      const result = await repository.getClaim('claim-1');

      expect(result).toMatchObject({ claimId: 'claim-1', claimStatus: 'Assessment', estimatedRepairCost: 1500 });
    });
  });

  describe('updateClaim', () => {
    it('sends a partial UpdateExpression covering only the given fields', async () => {
      ddbMock.on(UpdateCommand).resolves({});
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await repository.updateClaim('claim-1', { claimStatus: 'Assessment', estimatedRepairCost: 2500 });

      const call = ddbMock.call(0);
      expect(call.args[0].input).toEqual({
        TableName: CLAIMS_TABLE_NAME,
        Key: { claimId: 'claim-1' },
        UpdateExpression: 'SET #f0 = :v0, #f1 = :v1',
        ExpressionAttributeNames: { '#f0': 'claimStatus', '#f1': 'estimatedRepairCost' },
        ExpressionAttributeValues: { ':v0': 'Assessment', ':v1': 2500 },
      });
    });

    it('is a no-op when given an empty update', async () => {
      ddbMock.on(UpdateCommand).resolves({});
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await repository.updateClaim('claim-1', {});

      expect(ddbMock.calls()).toHaveLength(0);
    });

    it('throws ClaimsAccessError when the update fails', async () => {
      ddbMock.on(UpdateCommand).rejects(new Error('Item not found'));
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await expect(repository.updateClaim('claim-1', { claimStatus: 'Approved' })).rejects.toBeInstanceOf(
        ClaimsAccessError,
      );
    });
  });

  describe('appendStatusHistory', () => {
    it('sends a list_append UpdateExpression for a single entry', async () => {
      ddbMock.on(UpdateCommand).resolves({});
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await repository.appendStatusHistory('claim-1', 'Assessment', '2024-01-02T00:00:00.000Z');

      const call = ddbMock.call(0);
      expect(call.args[0].input).toEqual({
        TableName: CLAIMS_TABLE_NAME,
        Key: { claimId: 'claim-1' },
        UpdateExpression: 'SET #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :entry)',
        ExpressionAttributeNames: { '#statusHistory': 'statusHistory' },
        ExpressionAttributeValues: {
          ':emptyList': [],
          ':entry': [{ status: 'Assessment', timestamp: '2024-01-02T00:00:00.000Z' }],
        },
      });
    });

    it('throws ClaimsAccessError when the update fails', async () => {
      ddbMock.on(UpdateCommand).rejects(new Error('Network error'));
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await expect(
        repository.appendStatusHistory('claim-1', 'Assessment', '2024-01-02T00:00:00.000Z'),
      ).rejects.toBeInstanceOf(ClaimsAccessError);
    });

    it('grows the history list by exactly one entry per call across multiple sequential calls, preserving order', async () => {
      // Simulates DynamoDB's server-side list_append semantics against an
      // in-memory "table" so we can observe the cumulative effect of
      // multiple sequential appendStatusHistory calls, exercising the same
      // list_append expression the production code sends.
      let history: StatusHistoryEntry[] = [];

      ddbMock.on(UpdateCommand).callsFake((input) => {
        const values = input.ExpressionAttributeValues as { ':entry': StatusHistoryEntry[] };
        history = [...history, ...values[':entry']];
        return { Attributes: { claimId: 'claim-1', statusHistory: history } };
      });

      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      const transitions: Array<{ status: StatusHistoryEntry['status']; timestamp: string }> = [
        { status: 'Intake', timestamp: '2024-01-01T00:00:00.000Z' },
        { status: 'Assessment', timestamp: '2024-01-02T00:00:00.000Z' },
        { status: 'Fraud_Check', timestamp: '2024-01-03T00:00:00.000Z' },
        { status: 'Approved', timestamp: '2024-01-04T00:00:00.000Z' },
        { status: 'Paid', timestamp: '2024-01-05T00:00:00.000Z' },
      ];

      for (let i = 0; i < transitions.length; i++) {
        const before = history.length;
        const transition = transitions[i]!;
        await repository.appendStatusHistory('claim-1', transition.status, transition.timestamp);
        // Grows by exactly one entry per call.
        expect(history).toHaveLength(before + 1);
      }

      // Final history has exactly one entry per transition, in order, with
      // no entries lost, reordered, or duplicated (mirrors Property 28).
      expect(history).toEqual(transitions);
      expect(ddbMock.calls()).toHaveLength(transitions.length);
    });
  });
});
