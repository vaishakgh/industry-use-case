/**
 * Dispute submission validation.
 *
 * Accepts a dispute if and only if Claim_Status is Approved or Denied
 * and the reason is non-empty and within maxDisputeReasonLength.
 *
 * _Requirements: 11.1, 11.4, 11.5_
 */
import type { ClaimStatus, SystemConfig, ISODateTimeString, DecisionOutcome } from '@claims/shared';
/** Input to the dispute submission handler. */
export interface DisputeSubmissionInput {
    claimId: string;
    claimStatus: ClaimStatus;
    reason: string;
    originalDecision: DecisionOutcome;
    customerId: string;
    timestamp?: ISODateTimeString;
}
/** Dispute submission validation result. */
export type DisputeSubmissionResult = {
    accepted: true;
    disputeRecord: {
        reason: string;
        submittedAt: ISODateTimeString;
        originalDecision: DecisionOutcome;
    };
} | {
    accepted: false;
    rejectionReason: string;
};
/** Statuses that permit dispute submission. */
export declare const DISPUTABLE_STATUSES: ClaimStatus[];
/**
 * Validates and processes a dispute submission.
 *
 * Validation rules:
 * 1. Claim_Status must be Approved or Denied (Req 11.4)
 * 2. Reason must be non-empty (Req 11.5)
 * 3. Reason must be within maxDisputeReasonLength (Req 11.5)
 *
 * _Requirements: 11.1, 11.4, 11.5_
 */
export declare function validateDisputeSubmission(input: DisputeSubmissionInput, config: SystemConfig): DisputeSubmissionResult;
//# sourceMappingURL=disputeSubmission.d.ts.map