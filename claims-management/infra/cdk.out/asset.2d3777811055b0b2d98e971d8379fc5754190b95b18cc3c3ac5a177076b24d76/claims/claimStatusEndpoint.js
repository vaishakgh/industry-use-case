"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildClaimStatusResponse = buildClaimStatusResponse;
/**
 * Builds the claim status response from claim data.
 * Passes through the status and history without mutation.
 */
function buildClaimStatusResponse(claimId, currentStatus, statusHistory) {
    return {
        claimId,
        currentStatus,
        statusHistory,
    };
}
//# sourceMappingURL=claimStatusEndpoint.js.map