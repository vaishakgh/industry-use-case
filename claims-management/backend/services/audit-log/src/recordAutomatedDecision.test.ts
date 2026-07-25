import type { AuditLogRecord, FraudIndicatorRecord } from '@claims/shared';
import { AuditLogAccessError, type AuditLogRepository } from './repository/auditLogRepository';
import { DEFAULT_ACTOR_TYPE, recordAutomatedDecision, type RecordAutomatedDecisionInput } from './recordAutomatedDecision';

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

describe('recordAutomatedDecision', () => {
  it('records a decision with no fraud indicators, including all required fields', async () => {
    const repository = buildFakeRepository();
    const input = buildInput();

    const result = await recordAutomatedDecision(input, repository);

    expect(repository.putAuditLogRecord).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      decisionType: input.decisionType,
      claimId: input.claimId,
      inputs: input.inputs,
      confidenceScore: input.confidenceScore,
      timestamp: input.timestamp,
      fraudIndicators: null,
      actorType: DEFAULT_ACTOR_TYPE,
      actorId: null,
    });
    // A fresh, non-empty ULID logId must be generated.
    expect(typeof result.logId).toBe('string');
    expect(result.logId.length).toBeGreaterThan(0);
    expect(repository.records).toHaveLength(1);
    expect(repository.records.at(0)).toEqual(result);
  });

  it('records a decision with fraud indicators and their confidence scores', async () => {
    const repository = buildFakeRepository();
    const fraudIndicators: FraudIndicatorRecord[] = [
      { type: 'ClaimFrequency', confidenceScore: 0.8, detectedAt: '2024-01-01T00:00:00.000Z' },
      { type: 'TimelineDiscrepancy', confidenceScore: 0.65, detectedAt: '2024-01-01T00:05:00.000Z' },
    ];
    const input = buildInput({
      decisionType: 'FraudFlag',
      fraudIndicators,
      actorType: 'System',
    });

    const result = await recordAutomatedDecision(input, repository);

    expect(result.fraudIndicators).toEqual(fraudIndicators);
    expect(repository.records).toHaveLength(1);
    expect(repository.records.at(0)?.fraudIndicators).toEqual(fraudIndicators);
  });

  it('applies optional actor fields when provided', async () => {
    const repository = buildFakeRepository();
    const input = buildInput({ actorType: 'HumanAdjuster', actorId: 'adjuster-42' });

    const result = await recordAutomatedDecision(input, repository);

    expect(result.actorType).toBe('HumanAdjuster');
    expect(result.actorId).toBe('adjuster-42');
  });

  it('propagates repository errors instead of swallowing them', async () => {
    const repository: AuditLogRepository = {
      putAuditLogRecord: jest.fn(async () => {
        throw new AuditLogAccessError('write failed');
      }),
      queryAuditLogByClaimId: jest.fn(async () => []),
    };

    await expect(recordAutomatedDecision(buildInput(), repository)).rejects.toBeInstanceOf(AuditLogAccessError);
  });

  it('generates a distinct logId for each call', async () => {
    const repository = buildFakeRepository();

    const first = await recordAutomatedDecision(buildInput(), repository);
    const second = await recordAutomatedDecision(buildInput(), repository);

    expect(first.logId).not.toBe(second.logId);
  });
});
