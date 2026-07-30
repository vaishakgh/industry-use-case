"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFraudReview = resolveFraudReview;
/**
 * Resolves a fraud analyst's review of a flagged claim.
 *
 * Decision outcomes:
 * - `clear`: removes the fraud flag, claim resumes lifecycle at Fraud_Check
 *   (which will now pass since the flag is cleared)
 * - `deny`: sets Claim_Status to Denied
 *
 * _Requirements: 6.6_
 */
function resolveFraudReview(input) {
    const timestamp = input.timestamp ?? new Date().toISOString();
    if (input.decision === 'clear') {
        return {
            claimId: input.claimId,
            analystId: input.analystId,
            decision: 'clear',
            newClaimStatus: 'Fraud_Check',
            fraudFlagCleared: true,
            timestamp,
        };
    }
    return {
        claimId: input.claimId,
        analystId: input.analystId,
        decision: 'deny',
        newClaimStatus: 'Denied',
        fraudFlagCleared: false,
        timestamp,
    };
}
//# sourceMappingURL=resolveFraudReview.js.map