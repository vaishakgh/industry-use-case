/**
 * Property-based tests for Claims Orchestrator lifecycle logic.
 *
 * Property 19: Auto-approval decision table
 * Property 20: Adjuster decision recording
 * Property 24: Payout suspension while fraud-flagged
 * Property 26: Lifecycle stage ordering conformance
 * Property 27: Retry-then-escalate on persistent failure
 * Property 29: Terminal status notification uses the original channel
 *
 * _Requirements: 5.1-5.5, 6.5, 7.1-7.3, 7.7, 7.8_
 */
import fc from 'fast-check';
import {
  CLAIM_STATUS_VALUES,
  CHANNEL_VALUES,
  DEFAULT_SYSTEM_CONFIG,
  SEVERITY_RATING_VALUES,
  type ClaimStatus,
  type SystemConfig,
} from '@claims/shared';
import { computeStatusSequence, isValidTransition, InvalidTransitionError, VALID_TRANSITIONS } from './lifecycleGraph';
import { classifyFailure, evaluateRetryDecision, type FailureClassification } from './retryEscalation';
import { evaluateAutoApproval, type ApprovalInput } from './autoApproval';
import { checkPayoutEligibility, type PayoutEligibilityInput } from './payoutSuspension';
import { recordAdjusterDecision, type AdjusterDecisionType } from './adjusterDecision';
import { buildCustomerNotification, isNotifiableStatus, NOTIFIABLE_STATUSES } from './notifyCustomer';
import { executePayout, type PaymentClient } from './payoutIdempotency';

// ─── Property 26: Lifecycle stage ordering conformance ───────────────────────

describe('Property 26: Lifecycle stage ordering conformance', () => {
  it('computeStatusSequence accepts any sequence of valid transitions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (maxSteps) => {
          // Build a valid path from Intake
          let current: ClaimStatus = 'Intake';
          const transitions: ClaimStatus[] = [];

          for (let i = 0; i < maxSteps; i++) {
            const validNexts: ClaimStatus[] = VALID_TRANSITIONS[current];
            if (validNexts.length === 0) break;
            const next: ClaimStatus = validNexts[Math.floor(Math.random() * validNexts.length)]!;
            transitions.push(next);
            current = next;
          }

          const result = computeStatusSequence('Intake', transitions);
          expect(result[0]).toBe('Intake');
          expect(result.length).toBe(transitions.length + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects any transition not in the valid graph', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CLAIM_STATUS_VALUES),
        fc.constantFrom(...CLAIM_STATUS_VALUES),
        (from, to) => {
          if (!isValidTransition(from, to)) {
            expect(() => computeStatusSequence(from, [to])).toThrow(InvalidTransitionError);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 27: Retry-then-escalate on persistent failure ──────────────────

describe('Property 27: Retry-then-escalate on persistent failure', () => {
  it('escalates immediately on persistent failure regardless of attempt count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (attempt) => {
          const classification: FailureClassification = {
            type: 'PersistentFailure',
            errorName: 'ValidationError',
            message: 'Invalid input',
          };
          const decision = evaluateRetryDecision(classification, attempt, DEFAULT_SYSTEM_CONFIG);
          expect(decision.action).toBe('escalate');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('retries transient failures when attempts < max, escalates when >= max', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (attempt, maxAttempts) => {
          const config: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG, stageRetryMaxAttempts: maxAttempts };
          const classification: FailureClassification = {
            type: 'TransientFailure',
            errorName: 'ThrottlingException',
            message: 'Rate exceeded',
          };

          const decision = evaluateRetryDecision(classification, attempt, config);

          if (attempt >= maxAttempts) {
            expect(decision.action).toBe('escalate');
          } else {
            expect(decision.action).toBe('retry');
            if (decision.action === 'retry') {
              expect(decision.attemptNumber).toBe(attempt + 1);
              expect(decision.backoffMs).toBeGreaterThan(0);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 19: Auto-approval decision table ───────────────────────────────

describe('Property 19: Auto-approval decision table', () => {
  it('auto-approves iff no fraud flag AND severity <= threshold AND cost <= threshold', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom(...SEVERITY_RATING_VALUES),
        fc.integer({ min: 0, max: 10000 }),
        (fraudFlag, severity, cost) => {
          const input: ApprovalInput = {
            fraudFlag,
            severityRating: severity,
            estimatedRepairCost: cost,
          };
          const config = DEFAULT_SYSTEM_CONFIG;
          const decision = evaluateAutoApproval(input, config);

          const severityOrder = { Low: 0, Medium: 1, High: 2 };
          const withinSeverity =
            severityOrder[severity] <= severityOrder[config.autoApprovalThreshold.maxSeverityRating];
          const withinCost = cost <= config.autoApprovalThreshold.maxEstimatedRepairCost;

          const shouldApprove = !fraudFlag && withinSeverity && withinCost;

          expect(decision.approved).toBe(shouldApprove);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 24: Payout suspension while fraud-flagged ──────────────────────

describe('Property 24: Payout suspension while fraud-flagged', () => {
  it('suspends payout iff fraudFlag is true and no analyst decision recorded', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: null }),
        (fraudFlag, analystId) => {
          const input: PayoutEligibilityInput = { fraudFlag, fraudAnalystId: analystId };
          const result = checkPayoutEligibility(input);

          const shouldBeSuspended = fraudFlag && analystId === null;

          if (shouldBeSuspended) {
            expect(result.eligible).toBe(false);
          } else {
            expect(result.eligible).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 20: Adjuster decision recording ────────────────────────────────

describe('Property 20: Adjuster decision recording', () => {
  it('sets status to Approved on approve and Denied on deny, always recording adjuster identity', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 26 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.constantFrom<AdjusterDecisionType>('approve', 'deny'),
        (claimId, adjusterId, decision) => {
          const result = recordAdjusterDecision({
            claimId,
            adjusterId,
            decision,
            timestamp: '2024-06-01T00:00:00.000Z',
          });

          expect(result.claimId).toBe(claimId);
          expect(result.adjusterId).toBe(adjusterId);

          if (decision === 'approve') {
            expect(result.newClaimStatus).toBe('Approved');
          } else {
            expect(result.newClaimStatus).toBe('Denied');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 29: Terminal status notification uses the original channel ──────

describe('Property 29: Terminal status notification uses original channel', () => {
  it('builds a notification routed to originalChannel for notifiable statuses only', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 26 }),
        fc.constantFrom(...CHANNEL_VALUES),
        fc.constantFrom(...CLAIM_STATUS_VALUES),
        (claimId, channel, status) => {
          const notification = buildCustomerNotification(claimId, channel, status);

          if (isNotifiableStatus(status)) {
            expect(notification).not.toBeNull();
            expect(notification?.channel).toBe(channel);
            expect(notification?.claimId).toBe(claimId);
            expect(notification?.status).toBe(status);
          } else {
            expect(notification).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Payout idempotency ──────────────────────────────────────────────────────

describe('Payout idempotency', () => {
  it('uses claimId as idempotency key and sets status to Paid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 26 }),
        fc.integer({ min: 1, max: 50000 }),
        async (claimId, amount) => {
          const client: PaymentClient = {
            initiatePayment: async (key) => {
              expect(key).toBe(claimId);
              return true;
            },
          };

          const result = await executePayout(
            { claimId, approvedAmount: amount, timestamp: '2024-06-01T00:00:00.000Z' },
            client,
          );

          expect(result.idempotencyKey).toBe(claimId);
          expect(result.newClaimStatus).toBe('Paid');
          expect(result.paymentInitiated).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
