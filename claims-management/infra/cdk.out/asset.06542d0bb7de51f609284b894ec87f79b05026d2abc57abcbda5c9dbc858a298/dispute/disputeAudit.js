"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDisputeResolutionAudit = recordDisputeResolutionAudit;
/**
 * Records the dispute resolution to the audit log.
 *
 * Captures the original decision, revised decision, and the resolving
 * adjuster's identity.
 *
 * @param claimId The claim that was disputed
 * @param originalDecision The decision that was originally made
 * @param revisedDecision The adjuster's revised decision
 * @param adjusterId The resolving adjuster's identity
 * @param recordDecision The audit-write-precedes-effect function
 */
async function recordDisputeResolutionAudit(claimId, originalDecision, revisedDecision, adjusterId, recordDecision) {
    return recordDecision({
        decisionType: 'DisputeResolution',
        claimId,
        inputs: {
            originalDecision,
            revisedDecision,
            adjusterId,
        },
        confidenceScore: null,
        timestamp: new Date().toISOString(),
        fraudIndicators: null,
        actorType: 'HumanAdjuster',
        actorId: adjusterId,
    });
}
//# sourceMappingURL=disputeAudit.js.map