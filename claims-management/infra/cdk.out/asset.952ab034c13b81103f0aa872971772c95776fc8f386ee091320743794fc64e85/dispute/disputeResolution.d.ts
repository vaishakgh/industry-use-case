/**
 * Dispute resolution recording handler.
 *
 * Accepts the resolution and sets Claim_Status to Resolved, recording the
 * revised decision and adjuster identity. The revised decision must be
 * Approved or Denied.
 *
 * _Requirements: 11.3_
 */
import type { ClaimStatus, DecisionOutcome, ISODateTimeString } from '@claims/shared';
/** Input to the dispute resolution handler. */
export interface DisputeResolutionInput {
    claimId: string;
    adjusterId: string;
    revisedDecision: DecisionOutcome;
    timestamp?: ISODateTimeString;
}
/** Result of resolving a dispute. */
export interface DisputeResolutionResult {
    claimId: string;
    adjusterId: string;
    revisedDecision: DecisionOutcome;
    newClaimStatus: ClaimStatus;
    timestamp: ISODateTimeString;
}
/** Valid revised decisions for a dispute resolution. */
export declare const VALID_REVISED_DECISIONS: DecisionOutcome[];
/**
 * Records a dispute resolution, setting the claim status to Resolved.
 *
 * The revised decision must be Approved or Denied (Req 11.3).
 *
 * @returns The resolution result, or throws if the revised decision is invalid
 */
export declare function resolveDispute(input: DisputeResolutionInput): DisputeResolutionResult;
//# sourceMappingURL=disputeResolution.d.ts.map