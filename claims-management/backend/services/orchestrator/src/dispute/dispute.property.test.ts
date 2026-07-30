/**
 * Property-based tests for Dispute Resolution workflow.
 *
 * Property 39: Dispute submission validation
 * Property 40: Dispute review visibility round-trip
 * Property 41: Dispute resolution decision constraint and recording
 * Property 42: Dispute resolution audit completeness
 *
 * _Requirements: 11.1-11.6_
 */
import fc from 'fast-check';
import {
  CLAIM_STATUS_VALUES,
  DECISION_OUTCOME_VALUES,
  DEFAULT_SYSTEM_CONFIG,
  type AuditLogRecord,
  type ClaimStatus,
  type DecisionOutcome,
  type DisputeRecord,
  type SystemConfig,
} from '@claims/shared';
import { validateDisputeSubmission, DISPUTABLE_STATUSES } from './disputeSubmission';
import { resolveDispute, VALID_REVISED_DECISIONS } from './disputeResolution';
import { assembleDisputeReviewPackage } from './disputeReviewVisibility';
import { recordDisputeResolutionAudit } from './disputeAudit';

// ─── Property 39: Dispute submission validation ──────────────────────────────

describe('Property 39: Dispute submission validation', () => {
  it('accepts iff status is Approved/Denied AND reason is non-empty AND within max length', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CLAIM_STATUS_VALUES),
        fc.string({ minLength: 0, maxLength: 2500 }),
        fc.constantFrom(...DECISION_OUTCOME_VALUES),
        fc.integer({ min: 100, max: 2000 }),
        (status, reason, originalDecision, maxLength) => {
          const config: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG, maxDisputeReasonLength: maxLength };
          const result = validateDisputeSubmission(
            {
              claimId: 'CLM-001',
              claimStatus: status,
              reason,
              originalDecision,
              customerId: 'CUST-001',
              timestamp: '2024-06-01T00:00:00.000Z',
            },
            config,
          );

          const trimmedReason = reason.trim();
          const statusValid = DISPUTABLE_STATUSES.includes(status);
          const reasonNonEmpty = trimmedReason.length > 0;
          const reasonWithinLength = trimmedReason.length <= maxLength;
          const shouldAccept = statusValid && reasonNonEmpty && reasonWithinLength;

          expect(result.accepted).toBe(shouldAccept);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 40: Dispute review visibility round-trip ───────────────────────

describe('Property 40: Dispute review visibility round-trip', () => {
  it('assembles the original decision and dispute reason without mutation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 26 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.constantFrom(...DECISION_OUTCOME_VALUES),
        (claimId, reason, originalDecision) => {
          const dispute: DisputeRecord = {
            reason,
            submittedAt: '2024-06-01T00:00:00.000Z',
            originalDecision,
            revisedDecision: null,
            resolvedByAdjusterId: null,
          };

          const auditRecord: AuditLogRecord = {
            logId: 'LOG-001',
            claimId,
            decisionType: 'Approval',
            inputs: { test: true },
            confidenceScore: 0.9,
            fraudIndicators: null,
            timestamp: '2024-05-01T00:00:00.000Z',
            actorType: 'System',
            actorId: null,
          };

          const pkg = assembleDisputeReviewPackage(claimId, dispute, auditRecord);

          expect(pkg.claimId).toBe(claimId);
          expect(pkg.disputeReason).toBe(reason);
          expect(pkg.originalDecision).toEqual(auditRecord);
          expect(pkg.submittedAt).toBe(dispute.submittedAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 41: Dispute resolution decision constraint and recording ───────

describe('Property 41: Dispute resolution decision constraint and recording', () => {
  it('sets status to Resolved and records adjuster identity for valid revised decisions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 26 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.constantFrom(...DECISION_OUTCOME_VALUES),
        (claimId, adjusterId, revisedDecision) => {
          const result = resolveDispute({
            claimId,
            adjusterId,
            revisedDecision,
            timestamp: '2024-06-01T00:00:00.000Z',
          });

          expect(result.newClaimStatus).toBe('Resolved');
          expect(result.adjusterId).toBe(adjusterId);
          expect(result.revisedDecision).toBe(revisedDecision);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 42: Dispute resolution audit completeness ──────────────────────

describe('Property 42: Dispute resolution audit completeness', () => {
  it('records original decision, revised decision, and adjuster identity in the audit log', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 26 }),
        fc.constantFrom(...DECISION_OUTCOME_VALUES),
        fc.constantFrom(...DECISION_OUTCOME_VALUES),
        fc.string({ minLength: 3, maxLength: 20 }),
        async (claimId, originalDecision, revisedDecision, adjusterId) => {
          let capturedInput: Record<string, unknown> | undefined;

          const mockRecordDecision = async (input: Record<string, unknown>) => {
            capturedInput = input;
            return {
              logId: 'LOG-001',
              claimId,
              decisionType: 'DisputeResolution',
              inputs: input.inputs,
              confidenceScore: null,
              fraudIndicators: null,
              timestamp: '2024-06-01T00:00:00.000Z',
              actorType: 'HumanAdjuster',
              actorId: adjusterId,
            } as AuditLogRecord;
          };

          await recordDisputeResolutionAudit(
            claimId,
            originalDecision,
            revisedDecision,
            adjusterId,
            mockRecordDecision as any,
          );

          expect(capturedInput).toBeDefined();
          expect(capturedInput!.claimId).toBe(claimId);
          expect(capturedInput!.actorId).toBe(adjusterId);
          expect(capturedInput!.actorType).toBe('HumanAdjuster');
          expect((capturedInput!.inputs as any).originalDecision).toBe(originalDecision);
          expect((capturedInput!.inputs as any).revisedDecision).toBe(revisedDecision);
        },
      ),
      { numRuns: 100 },
    );
  });
});
