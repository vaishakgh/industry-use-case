"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
/**
 * Lambda handler entry point for Orchestrator functions.
 *
 * Handles EvaluateApproval, RunPayout, and NotifyCustomer based on
 * the event shape.
 */
const autoApproval_1 = require("./lifecycle/autoApproval");
const payoutSuspension_1 = require("./lifecycle/payoutSuspension");
const payoutIdempotency_1 = require("./lifecycle/payoutIdempotency");
const notifyCustomer_1 = require("./lifecycle/notifyCustomer");
const adjusterDecision_1 = require("./lifecycle/adjusterDecision");
const shared_1 = require("@claims/shared");
/**
 * Mock payment client for dev — always succeeds.
 * In production, replace with real payment provider.
 */
const mockPaymentClient = {
    initiatePayment: async (idempotencyKey, amount) => true,
};
async function handler(event) {
    const claimId = event.claimId || 'unknown';
    const config = shared_1.DEFAULT_SYSTEM_CONFIG;
    try {
        // Determine function from event context
        const functionType = event.functionType || detectFunctionType(event);
        switch (functionType) {
            case 'evaluateApproval': {
                const input = {
                    fraudFlag: event.fraudFlagged || false,
                    severityRating: event.severityRating || 'Low',
                    estimatedRepairCost: event.estimatedRepairCost || 0,
                };
                const decision = (0, autoApproval_1.evaluateAutoApproval)(input, config);
                if (decision.approved) {
                    // Check payout eligibility (fraud suspension)
                    const eligibility = (0, payoutSuspension_1.checkPayoutEligibility)({
                        fraudFlag: event.fraudFlagged || false,
                        fraudAnalystId: event.fraudAnalystId || null,
                    });
                    if (!eligibility.eligible) {
                        return { claimId, decision: 'fraud_flagged', reason: eligibility.reason };
                    }
                    return { claimId, decision: 'approved', reason: 'Auto-approved' };
                }
                return { claimId, decision: 'pending_adjuster', reason: decision.approved ? '' : decision.reason };
            }
            case 'runPayout': {
                const result = await (0, payoutIdempotency_1.executePayout)({ claimId, approvedAmount: event.estimatedRepairCost || event.approvedAmount || 0 }, mockPaymentClient);
                return result;
            }
            case 'notifyCustomer': {
                const notification = (0, notifyCustomer_1.buildCustomerNotification)(claimId, event.originalChannel || 'Email', event.newClaimStatus || event.status || 'Approved');
                return { claimId, notified: true, notification };
            }
            case 'adjusterDecision': {
                const result = (0, adjusterDecision_1.recordAdjusterDecision)({
                    claimId,
                    adjusterId: event.adjusterId,
                    decision: event.adjusterDecision,
                });
                return result;
            }
            default:
                return { claimId, decision: 'approved', reason: 'Default pass-through' };
        }
    }
    catch (error) {
        return { claimId, error: error.message };
    }
}
function detectFunctionType(event) {
    if (event.decision === 'approved' || event.paymentInitiated !== undefined)
        return 'runPayout';
    if (event.notified || event.newClaimStatus)
        return 'notifyCustomer';
    if (event.adjusterDecision)
        return 'adjusterDecision';
    return 'evaluateApproval';
}
//# sourceMappingURL=handler.js.map