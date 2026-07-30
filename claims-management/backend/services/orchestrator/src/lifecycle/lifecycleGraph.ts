/**
 * Claim lifecycle stage sequencing model/validator.
 *
 * Defines the valid transitions in the claims lifecycle and provides a
 * pure function that, given a sequence of stage-completion events,
 * computes the resulting Claim_Status sequence and rejects any transition
 * not permitted by the lifecycle graph.
 *
 * Valid lifecycle graph (from design.md):
 *   Intake → Assessment → Fraud_Check → Approved/Denied/Pending_Adjuster_Review
 *   Fraud_Check → Pending_Adjuster_Review (fraud flagged, awaiting analyst)
 *   Approved → Paid
 *   Approved/Denied → Disputed → Resolved
 *
 * _Requirements: 7.1, 7.4, 7.5, 7.7_
 */
import type { ClaimStatus } from '@claims/shared';

/**
 * The set of valid transitions. For each status, lists the statuses it
 * may transition to.
 */
export const VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  Intake: ['Assessment'],
  Assessment: ['Fraud_Check', 'Pending_Adjuster_Review'],
  Fraud_Check: ['Approved', 'Denied', 'Pending_Adjuster_Review'],
  Pending_Adjuster_Review: ['Approved', 'Denied'],
  Approved: ['Paid', 'Disputed'],
  Denied: ['Disputed'],
  Paid: [],
  Disputed: ['Resolved'],
  Resolved: [],
};

/** Error thrown when a lifecycle transition is invalid. */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: ClaimStatus,
    public readonly to: ClaimStatus,
  ) {
    super(`Invalid lifecycle transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Checks whether a transition from `from` to `to` is valid per the
 * lifecycle graph.
 */
export function isValidTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Given a sequence of stage-completion events (status transitions),
 * starting from an initial status, computes the resulting status sequence
 * and throws `InvalidTransitionError` if any transition is not permitted.
 *
 * @param initialStatus The claim's starting status
 * @param transitions The ordered sequence of target statuses to transition through
 * @returns The full status history including the initial status
 * @throws InvalidTransitionError if any transition is invalid
 */
export function computeStatusSequence(
  initialStatus: ClaimStatus,
  transitions: ClaimStatus[],
): ClaimStatus[] {
  const sequence: ClaimStatus[] = [initialStatus];
  let current = initialStatus;

  for (const next of transitions) {
    if (!isValidTransition(current, next)) {
      throw new InvalidTransitionError(current, next);
    }
    sequence.push(next);
    current = next;
  }

  return sequence;
}
