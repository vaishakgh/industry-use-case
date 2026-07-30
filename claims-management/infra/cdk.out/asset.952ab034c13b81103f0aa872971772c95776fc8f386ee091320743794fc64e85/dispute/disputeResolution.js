"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_REVISED_DECISIONS = void 0;
exports.resolveDispute = resolveDispute;
/** Valid revised decisions for a dispute resolution. */
exports.VALID_REVISED_DECISIONS = ['Approved', 'Denied'];
/**
 * Records a dispute resolution, setting the claim status to Resolved.
 *
 * The revised decision must be Approved or Denied (Req 11.3).
 *
 * @returns The resolution result, or throws if the revised decision is invalid
 */
function resolveDispute(input) {
    if (!exports.VALID_REVISED_DECISIONS.includes(input.revisedDecision)) {
        throw new Error(`Invalid revised decision "${input.revisedDecision}". Must be one of: ${exports.VALID_REVISED_DECISIONS.join(', ')}`);
    }
    const timestamp = input.timestamp ?? new Date().toISOString();
    return {
        claimId: input.claimId,
        adjusterId: input.adjusterId,
        revisedDecision: input.revisedDecision,
        newClaimStatus: 'Resolved',
        timestamp,
    };
}
//# sourceMappingURL=disputeResolution.js.map