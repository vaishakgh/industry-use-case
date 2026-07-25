import type { AuditLogRecord } from '@claims/shared';
import { AuditLogAccessError, AuditLogDuplicateRecordError, type AuditLogRepository } from './repository/auditLogRepository';
import type { RecordAutomatedDecisionInput } from './recordAutomatedDecision';
import { ClaimsAuditFailureError, CLAIMS_AUDIT_FAILURE_ERROR_NAME, recordDecisionBeforeEffect } from './recordDecisionBeforeEffect';

function buildInput(overrides: Partial<RecordAutomatedDecisionInput> = {}): RecordAutomatedDecisionInput {
  return {
    decisionType: 'Approval',
    claimId: 'claim-1',
    inputs: { severityRating: 'Low', estimatedRepairCost: 500 },
    confidenceScore: 0.92,
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildFakeRepository(): AuditLogRepository & { records: AuditLogRecord[] } {
  const records: AuditLogRecord[] = [];
  return {
    records,
    putAuditLogRecord: jest.fn(async (record: AuditLogRecord) => {
      records.push(record);
    }),
    queryAuditLogByClaimId: jest.fn(async () => records),
  };
}

describe('recordDecisionBeforeEffect', () => {
  it('returns the persisted record when the audit write succeeds, allowing the decision to proceed', async () => {
    const repository = buildFakeRepository();
    const input = buildInput();

    const result = await recordDecisionBeforeEffect(input, repository);

    expect(repository.putAuditLogRecord).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      decisionType: input.decisionType,
      claimId: input.claimId,
      inputs: input.inputs,
      confidenceScore: input.confidenceScore,
      timestamp: input.timestamp,
    });
    expect(repository.records).toHaveLength(1);
  });

  it('throws ClaimsAuditFailureError (never returns) when the underlying write fails with a genuine access error', async () => {
    const repository: AuditLogRepository = {
      putAuditLogRecord: jest.fn(async () => {
        throw new AuditLogAccessError('write failed');
      }),
      queryAuditLogByClaimId: jest.fn(async () => []),
    };
    const input = buildInput();

    await expect(recordDecisionBeforeEffect(input, repository)).rejects.toBeInstanceOf(ClaimsAuditFailureError);
  });

  it('throws ClaimsAuditFailureError (never returns) when the underlying write fails with a duplicate-record error', async () => {
    const repository: AuditLogRepository = {
      putAuditLogRecord: jest.fn(async () => {
        throw new AuditLogDuplicateRecordError('log-1');
      }),
      queryAuditLogByClaimId: jest.fn(async () => []),
    };
    const input = buildInput();

    let caught: unknown;
    try {
      await recordDecisionBeforeEffect(input, repository);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ClaimsAuditFailureError);
    expect((caught as ClaimsAuditFailureError).name).toBe(CLAIMS_AUDIT_FAILURE_ERROR_NAME);
    expect((caught as ClaimsAuditFailureError).claimId).toBe(input.claimId);
    expect((caught as ClaimsAuditFailureError).cause).toBeInstanceOf(AuditLogDuplicateRecordError);
  });

  it('never returns a success result when the underlying write failed (no side effect signal is given)', async () => {
    const repository: AuditLogRepository = {
      putAuditLogRecord: jest.fn(async () => {
        throw new Error('unexpected failure');
      }),
      queryAuditLogByClaimId: jest.fn(async () => []),
    };

    await expect(recordDecisionBeforeEffect(buildInput(), repository)).rejects.toThrow(ClaimsAuditFailureError);
  });
});
