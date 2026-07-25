/**
 * Property-based test for the audit-write-precedes-effect wrapper.
 *
 * See design.md: Property 33: Audit write precedes decision effect.
 *
 * _Requirements: 8.6_
 */
import fc from 'fast-check';
import type { AuditLogRecord } from '@claims/shared';
import { DECISION_TYPE_VALUES, ACTOR_TYPE_VALUES } from '@claims/shared';
import { AuditLogAccessError, AuditLogDuplicateRecordError, type AuditLogRepository } from './repository/auditLogRepository';
import type { RecordAutomatedDecisionInput } from './recordAutomatedDecision';
import { ClaimsAuditFailureError, recordDecisionBeforeEffect } from './recordDecisionBeforeEffect';

/** Arbitrary generator for `RecordAutomatedDecisionInput`. */
const recordAutomatedDecisionInputArbitrary: fc.Arbitrary<RecordAutomatedDecisionInput> = fc.record({
  decisionType: fc.constantFrom(...DECISION_TYPE_VALUES),
  claimId: fc.string({ minLength: 1, maxLength: 20 }),
  inputs: fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
  confidenceScore: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: null }),
  timestamp: fc.constant('2024-01-01T00:00:00.000Z'),
  fraudIndicators: fc.constant(null),
  actorType: fc.constantFrom(...ACTOR_TYPE_VALUES),
  actorId: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
}) satisfies fc.Arbitrary<RecordAutomatedDecisionInput>;

/**
 * The three kinds of failure the underlying `AuditLogRepository.putAuditLogRecord`
 * can produce, plus a "succeeds" mode -- covering "for ANY reason" from
 * Property 33.
 */
type WriteMode = 'succeeds' | 'accessError' | 'duplicateError' | 'genericError';

const writeModeArbitrary: fc.Arbitrary<WriteMode> = fc.constantFrom(
  'succeeds',
  'accessError',
  'duplicateError',
  'genericError',
);

/**
 * A fake `AuditLogRepository` whose `putAuditLogRecord` either succeeds
 * (recording the record) or throws according to the given `WriteMode`.
 */
function buildFakeRepository(mode: WriteMode): AuditLogRepository & { records: AuditLogRecord[] } {
  const records: AuditLogRecord[] = [];
  return {
    records,
    putAuditLogRecord: async (record: AuditLogRecord) => {
      switch (mode) {
        case 'succeeds':
          records.push(record);
          return;
        case 'accessError':
          throw new AuditLogAccessError('simulated access failure');
        case 'duplicateError':
          throw new AuditLogDuplicateRecordError(record.logId);
        case 'genericError':
          throw new Error('simulated unexpected failure');
      }
    },
    queryAuditLogByClaimId: async () => records,
  };
}

describe('recordDecisionBeforeEffect property tests', () => {
  // Feature: claims-management-fnol, Property 33: Audit write precedes decision effect
  it('returns the persisted record iff the underlying write succeeds, and throws ClaimsAuditFailureError iff it fails for any reason', async () => {
    await fc.assert(
      fc.asyncProperty(recordAutomatedDecisionInputArbitrary, writeModeArbitrary, async (input, mode) => {
        const repository = buildFakeRepository(mode);
        const writeShouldSucceed = mode === 'succeeds';

        let result: AuditLogRecord | undefined;
        let thrown: unknown;
        try {
          result = await recordDecisionBeforeEffect(input, repository);
        } catch (error) {
          thrown = error;
        }

        if (writeShouldSucceed) {
          // The write succeeded: the wrapper must return the persisted
          // record, and must never throw.
          expect(thrown).toBeUndefined();
          expect(result).toMatchObject({
            decisionType: input.decisionType,
            claimId: input.claimId,
            inputs: input.inputs,
            confidenceScore: input.confidenceScore,
            timestamp: input.timestamp,
          });
          expect(repository.records).toHaveLength(1);
        } else {
          // The write failed for some reason: the wrapper must throw
          // ClaimsAuditFailureError, and must never return a result.
          expect(result).toBeUndefined();
          expect(thrown).toBeInstanceOf(ClaimsAuditFailureError);
          expect(repository.records).toHaveLength(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
