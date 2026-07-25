/**
 * Property-based test for automated decision audit completeness.
 *
 * See design.md: Property 30: Automated decision audit completeness.
 *
 * _Requirements: 8.1, 8.3_
 */
import fc from 'fast-check';
import type { ActorType, AuditLogRecord, ConfidenceScore, DecisionType, FraudIndicatorRecord } from '@claims/shared';
import { ACTOR_TYPE_VALUES, DECISION_TYPE_VALUES } from '@claims/shared';
import type { AuditLogRepository } from './repository/auditLogRepository';
import { recordAutomatedDecision, type RecordAutomatedDecisionInput } from './recordAutomatedDecision';

/**
 * A fake, in-memory `AuditLogRepository` that simply appends every
 * persisted record to an array, mirroring the real repository's
 * append-only `putAuditLogRecord` semantics without any DynamoDB
 * dependency.
 */
class FakeAuditLogRepository implements AuditLogRepository {
  readonly records: AuditLogRecord[] = [];

  async putAuditLogRecord(record: AuditLogRecord): Promise<void> {
    this.records.push(record);
  }

  async queryAuditLogByClaimId(claimId: string): Promise<AuditLogRecord[]> {
    return this.records.filter((record) => record.claimId === claimId);
  }
}

/** Arbitrary generator for a `ConfidenceScore` in the closed range [0, 1]. */
const confidenceScoreArbitrary: fc.Arbitrary<ConfidenceScore> = fc.double({
  min: 0,
  max: 1,
  noNaN: true,
});

/** Arbitrary generator for a single `FraudIndicatorRecord`. */
const fraudIndicatorArbitrary: fc.Arbitrary<FraudIndicatorRecord> = fc.record({
  type: fc.string({ minLength: 1, maxLength: 20 }),
  confidenceScore: confidenceScoreArbitrary,
  detectedAt: fc.date({ noInvalidDate: true }).map((date) => date.toISOString()),
});

/**
 * Arbitrary generator for `inputs`: an arbitrary JSON-serializable record of
 * primitive values, matching what real callers (field extraction, damage
 * assessment, fraud flags, etc.) pass as the decision's inputs.
 */
const inputsArbitrary: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 15 }),
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  { maxKeys: 8 },
);

/** Arbitrary generator for `RecordAutomatedDecisionInput`. */
const recordAutomatedDecisionInputArbitrary: fc.Arbitrary<RecordAutomatedDecisionInput> = fc.record(
  {
    decisionType: fc.constantFrom(...DECISION_TYPE_VALUES) as fc.Arbitrary<DecisionType>,
    claimId: fc.string({ minLength: 1, maxLength: 30 }),
    inputs: inputsArbitrary,
    confidenceScore: fc.option(confidenceScoreArbitrary, { nil: null }),
    timestamp: fc.date({ noInvalidDate: true }).map((date) => date.toISOString()),
    fraudIndicators: fc.option(fc.array(fraudIndicatorArbitrary, { maxLength: 5 }), { nil: undefined }),
    actorType: fc.option(fc.constantFrom(...ACTOR_TYPE_VALUES) as fc.Arbitrary<ActorType>, { nil: undefined }),
    actorId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  },
  { requiredKeys: ['decisionType', 'claimId', 'inputs', 'confidenceScore', 'timestamp'] },
);

describe('recordAutomatedDecision property tests', () => {
  // Feature: claims-management-fnol, Property 30: Automated decision audit completeness
  it('persists an AuditLogRecord that exactly preserves every input field, with no data dropped, mutated, or incorrectly defaulted', async () => {
    await fc.assert(
      fc.asyncProperty(recordAutomatedDecisionInputArbitrary, async (input) => {
        const repository = new FakeAuditLogRepository();

        const result = await recordAutomatedDecision(input, repository);

        // Requirement 8.1: decision type, inputs, confidence score, claim
        // id, and timestamp are all preserved exactly.
        expect(result.decisionType).toBe(input.decisionType);
        expect(result.claimId).toBe(input.claimId);
        expect(result.inputs).toEqual(input.inputs);
        expect(result.confidenceScore).toBe(input.confidenceScore);
        expect(result.timestamp).toBe(input.timestamp);

        // Requirement 8.3: when fraud indicators are provided, they (and
        // each indicator's confidence score) are preserved exactly; when
        // omitted, the record defaults to null rather than dropping the
        // field or silently defaulting to an empty array.
        if (input.fraudIndicators !== undefined) {
          expect(result.fraudIndicators).toEqual(input.fraudIndicators);
        } else {
          expect(result.fraudIndicators).toBeNull();
        }

        // The record was actually persisted (round-tripped) exactly as
        // returned -- no divergence between the returned value and what
        // was written to the repository.
        expect(repository.records).toHaveLength(1);
        expect(repository.records.at(0)).toEqual(result);
      }),
      { numRuns: 100 },
    );
  });
});
