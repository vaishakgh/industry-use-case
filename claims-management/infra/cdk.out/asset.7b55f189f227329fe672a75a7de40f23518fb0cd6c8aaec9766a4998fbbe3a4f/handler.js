"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const analysisAggregation_1 = require("./analysisAggregation");
const resubmissionLifecycle_1 = require("./resubmissionLifecycle");
const shared_1 = require("@claims/shared");
/**
 * Mock Rekognition client for dev — produces deterministic results.
 * In production, replace with real Rekognition API calls.
 */
const mockRekognitionClient = {
    analyzePhoto: async (photoRef) => ({
        severityRating: 'Low',
        estimatedRepairCost: 500,
        confidenceScore: 0.85,
        qualitySufficient: true,
    }),
};
async function handler(event) {
    const claimId = event.claimId || 'unknown';
    const config = shared_1.DEFAULT_SYSTEM_CONFIG;
    try {
        // If photos are provided, run analysis
        const photoRefs = event.photoRefs || [`s3://claims-damage-photos-dev/${claimId}/photo-1.jpg`];
        const outcome = await (0, analysisAggregation_1.aggregatePhotoAnalysis)(photoRefs, mockRekognitionClient);
        const action = (0, resubmissionLifecycle_1.evaluateResubmissionLifecycle)(outcome, event.photoResubmissionCount || 0, config);
        if (action.type === 'apply_assessment') {
            return {
                claimId,
                severityRating: action.assessment.severityRating,
                estimatedRepairCost: action.assessment.estimatedRepairCost,
                confidenceScore: action.assessment.confidenceScore,
                status: 'success',
            };
        }
        if (action.type === 'request_resubmission') {
            return {
                claimId,
                status: 'resubmission_requested',
                resubmissionCount: action.resubmissionCount,
                message: action.message,
            };
        }
        // Escalation
        return {
            claimId,
            status: 'escalated',
            reason: action.reason,
            decision: 'pending_adjuster',
        };
    }
    catch (error) {
        return {
            claimId,
            status: 'error',
            error: error.message,
        };
    }
}
//# sourceMappingURL=handler.js.map