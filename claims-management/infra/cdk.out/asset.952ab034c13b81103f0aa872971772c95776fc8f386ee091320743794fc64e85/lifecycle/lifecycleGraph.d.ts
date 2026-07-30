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
export declare const VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]>;
/** Error thrown when a lifecycle transition is invalid. */
export declare class InvalidTransitionError extends Error {
    readonly from: ClaimStatus;
    readonly to: ClaimStatus;
    constructor(from: ClaimStatus, to: ClaimStatus);
}
/**
 * Checks whether a transition from `from` to `to` is valid per the
 * lifecycle graph.
 */
export declare function isValidTransition(from: ClaimStatus, to: ClaimStatus): boolean;
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
export declare function computeStatusSequence(initialStatus: ClaimStatus, transitions: ClaimStatus[]): ClaimStatus[];
//# sourceMappingURL=lifecycleGraph.d.ts.map