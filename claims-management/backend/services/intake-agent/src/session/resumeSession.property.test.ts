/**
 * Property-based tests for session resume.
 *
 * Property 11: Session resume preserves captured fields
 * For any ClaimSession with Claim_Status of Intake and any channel different
 * from the one that started the session, resuming that session by Claim_ID
 * or policy number SHALL return the previously captured Structured_Claim_Fields
 * values unchanged, regardless of how many prior channel interactions occurred.
 *
 * Property 12: Confirmed fields are never re-requested on resume
 * For any resumed ClaimSession and any subset of Structured_Claim_Fields
 * already marked confirmed, the FNOL Intake Agent's next set of
 * clarifying/confirmation prompts SHALL NOT include any field in that
 * confirmed subset.
 *
 * _Requirements: 3.1, 3.2, 3.3_
 */
import fc from 'fast-check';
import type {
  ClaimSession,
  StructuredClaimFields,
  StructuredFieldValue,
  StructuredFieldName,
} from '@claims/shared';
import {
  CHANNEL_VALUES,
  STRUCTURED_FIELD_NAME_VALUES,
} from '@claims/shared';
import type { ClaimSessionsTable } from '../claimSessions';
import { resumeSession, getPendingFields } from './resumeSession';

// --- Arbitrary generators ---

/** Generates a single StructuredFieldValue with various states. */
const structuredFieldValueArbitrary: fc.Arbitrary<StructuredFieldValue> = fc.oneof(
  // Unresolved: no value yet
  fc.constant({ value: null, confidenceScore: null, confirmed: false }),
  // Extracted but low confidence, not confirmed
  fc.record({
    value: fc.string({ minLength: 1, maxLength: 50 }),
    confidenceScore: fc.double({ min: 0, max: 0.74, noNaN: true }),
    confirmed: fc.constant(false),
  }),
  // Extracted with high confidence, not confirmed
  fc.record({
    value: fc.string({ minLength: 1, maxLength: 50 }),
    confidenceScore: fc.double({ min: 0.75, max: 1, noNaN: true }),
    confirmed: fc.constant(false),
  }),
  // Confirmed by customer (any confidence)
  fc.record({
    value: fc.string({ minLength: 1, maxLength: 50 }),
    confidenceScore: fc.double({ min: 0, max: 1, noNaN: true }),
    confirmed: fc.constant(true),
  }),
);

/** Generates a full StructuredClaimFields record. */
const structuredClaimFieldsArbitrary: fc.Arbitrary<StructuredClaimFields> = fc.record({
  policyNumber: structuredFieldValueArbitrary,
  incidentDate: structuredFieldValueArbitrary,
  incidentLocation: structuredFieldValueArbitrary,
  damageDescription: structuredFieldValueArbitrary,
});

/** Generates a ClaimSession in Intake status with arbitrary channel history. */
const claimSessionArbitrary: fc.Arbitrary<ClaimSession> = fc.record({
  claimId: fc.string({ minLength: 10, maxLength: 26 }),
  policyNumber: fc.oneof(
    fc.string({ minLength: 3, maxLength: 12 }).map((s) => `POL-${s}`),
    fc.constant(null),
  ),
  claimStatus: fc.constant('Intake' as const),
  channelHistory: fc
    .array(
      fc.record({
        channel: fc.constantFrom(...CHANNEL_VALUES),
        timestamp: fc.constant('2024-01-01T00:00:00.000Z'),
      }),
      { minLength: 1, maxLength: 5 },
    ),
  fieldAttemptCounts: fc.constant({}),
  voiceRetryCount: fc.nat({ max: 3 }),
  confirmAttemptCounts: fc.constant({}),
  expiresAt: fc.nat(),
});

/** A fake in-memory ClaimSessionsTable. */
function buildFakeSessionsTable(sessions: ClaimSession[]): ClaimSessionsTable {
  return {
    getClaimSession: async (claimId: string) =>
      sessions.find((s) => s.claimId === claimId),
    putClaimSession: async () => {},
    updateClaimSession: async (claimId: string) => {
      const s = sessions.find((s) => s.claimId === claimId);
      if (!s) throw new Error('not found');
      return s;
    },
    queryByPolicyNumberAndStatus: async (policyNumber: string, claimStatus) =>
      sessions.filter(
        (s) => s.policyNumber === policyNumber && s.claimStatus === claimStatus,
      ),
  };
}

describe('resumeSession property tests', () => {
  // Feature: claims-management-fnol, Property 11: Session resume preserves captured fields
  it('returns previously captured Structured_Claim_Fields unchanged on resume, regardless of channel history', async () => {
    await fc.assert(
      fc.asyncProperty(
        claimSessionArbitrary,
        structuredClaimFieldsArbitrary,
        fc.double({ min: 0, max: 1, noNaN: true }),
        async (session, capturedFields, threshold) => {
          // Ensure session has a non-null policyNumber for this test
          const sessionWithPolicy: ClaimSession = {
            ...session,
            policyNumber: session.policyNumber ?? 'POL-TEST',
          };

          const sessionsTable = buildFakeSessionsTable([sessionWithPolicy]);
          const getCapturedFields = async (_claimId: string) => capturedFields;

          // Resume by claimId
          const resultById = await resumeSession(
            { type: 'claimId', claimId: sessionWithPolicy.claimId },
            sessionsTable,
            getCapturedFields,
            threshold,
          );

          // Must successfully resume
          expect(resultById.outcome).toBe('resumed');
          if (resultById.outcome !== 'resumed') return;

          // The captured fields must be returned UNCHANGED — deep equality
          expect(resultById.result.capturedFields).toEqual(capturedFields);

          // Also test resume by policyNumber
          const resultByPolicy = await resumeSession(
            { type: 'policyNumber', policyNumber: sessionWithPolicy.policyNumber! },
            sessionsTable,
            getCapturedFields,
            threshold,
          );

          expect(resultByPolicy.outcome).toBe('resumed');
          if (resultByPolicy.outcome !== 'resumed') return;

          // Fields preserved identically regardless of lookup method
          expect(resultByPolicy.result.capturedFields).toEqual(capturedFields);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: claims-management-fnol, Property 12: Confirmed fields are never re-requested on resume
  it('never includes confirmed fields in the pendingFields list returned on resume', async () => {
    await fc.assert(
      fc.asyncProperty(
        claimSessionArbitrary,
        structuredClaimFieldsArbitrary,
        fc.double({ min: 0, max: 1, noNaN: true }),
        async (session, capturedFields, threshold) => {
          const sessionWithPolicy: ClaimSession = {
            ...session,
            policyNumber: session.policyNumber ?? 'POL-TEST',
          };

          const sessionsTable = buildFakeSessionsTable([sessionWithPolicy]);
          const getCapturedFields = async (_claimId: string) => capturedFields;

          const result = await resumeSession(
            { type: 'claimId', claimId: sessionWithPolicy.claimId },
            sessionsTable,
            getCapturedFields,
            threshold,
          );

          expect(result.outcome).toBe('resumed');
          if (result.outcome !== 'resumed') return;

          // Identify which fields are confirmed
          const confirmedFields: StructuredFieldName[] = STRUCTURED_FIELD_NAME_VALUES.filter(
            (fieldName) => capturedFields[fieldName].confirmed,
          );

          // Property 12: confirmed fields MUST NOT appear in pendingFields
          for (const confirmedField of confirmedFields) {
            expect(result.result.pendingFields).not.toContain(confirmedField);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('getPendingFields', () => {
  // Supplementary unit-style property test: getPendingFields never includes confirmed fields
  it('never returns a confirmed field regardless of value or confidence', () => {
    fc.assert(
      fc.property(
        structuredClaimFieldsArbitrary,
        fc.double({ min: 0, max: 1, noNaN: true }),
        (fields, threshold) => {
          const pending = getPendingFields(fields, threshold);

          for (const fieldName of STRUCTURED_FIELD_NAME_VALUES) {
            if (fields[fieldName].confirmed) {
              expect(pending).not.toContain(fieldName);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('includes unresolved fields (null value or below-threshold confidence, not confirmed)', () => {
    fc.assert(
      fc.property(
        structuredClaimFieldsArbitrary,
        fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        (fields, threshold) => {
          const pending = getPendingFields(fields, threshold);

          for (const fieldName of STRUCTURED_FIELD_NAME_VALUES) {
            const field = fields[fieldName];
            if (field.confirmed) continue;

            const isResolved =
              field.value !== null &&
              field.confidenceScore !== null &&
              field.confidenceScore >= threshold;

            if (!isResolved) {
              expect(pending).toContain(fieldName);
            } else {
              expect(pending).not.toContain(fieldName);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
