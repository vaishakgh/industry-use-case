/**
 * Dispute review visibility data assembly.
 *
 * Assembles the original Automated_Decision record and the customer's
 * dispute reason for the reviewing Human_Adjuster.
 *
 * _Requirements: 11.2_
 */
import type { AuditLogRecord, DisputeRecord } from '@claims/shared';
/** The data package assembled for the adjuster reviewing a dispute. */
export interface DisputeReviewPackage {
    claimId: string;
    disputeReason: string;
    originalDecision: AuditLogRecord;
    submittedAt: string;
}
/**
 * Assembles the review package for an adjuster reviewing a disputed claim.
 *
 * Per Req 11.2, the adjuster must see both the original automated decision
 * (with its inputs and confidence score) and the customer's dispute reason.
 *
 * @param claimId The claim being disputed
 * @param dispute The dispute record from the claim
 * @param originalDecisionRecord The audit log record of the original decision
 * @returns The assembled review package
 */
export declare function assembleDisputeReviewPackage(claimId: string, dispute: DisputeRecord, originalDecisionRecord: AuditLogRecord): DisputeReviewPackage;
//# sourceMappingURL=disputeReviewVisibility.d.ts.map