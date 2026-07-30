"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAdjusterDecision = recordAdjusterDecision;
/**
 * Records a human adjuster's decision on a claim.
 *
 * _Requirements: 5.4, 5.5_
 */
function recordAdjusterDecision(input) {
    const timestamp = input.timestamp ?? new Date().toISOString();
    const newClaimStatus = input.decision === 'approve' ? 'Approved' : 'Denied';
    return {
        claimId: input.claimId,
        adjusterId: input.adjusterId,
        decision: input.decision,
        newClaimStatus,
        timestamp,
    };
}
//# sourceMappingURL=adjusterDecision.js.map