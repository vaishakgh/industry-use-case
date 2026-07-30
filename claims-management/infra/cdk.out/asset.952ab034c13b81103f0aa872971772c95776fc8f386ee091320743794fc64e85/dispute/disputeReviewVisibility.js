"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assembleDisputeReviewPackage = assembleDisputeReviewPackage;
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
function assembleDisputeReviewPackage(claimId, dispute, originalDecisionRecord) {
    return {
        claimId,
        disputeReason: dispute.reason,
        originalDecision: originalDecisionRecord,
        submittedAt: dispute.submittedAt,
    };
}
//# sourceMappingURL=disputeReviewVisibility.js.map