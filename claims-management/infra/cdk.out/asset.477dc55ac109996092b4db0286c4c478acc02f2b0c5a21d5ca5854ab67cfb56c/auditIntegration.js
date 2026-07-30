"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFraudFlagDecision = recordFraudFlagDecision;
exports.recordFraudAnalystDecision = recordFraudAnalystDecision;
/**
 * Records a fraud flag decision to the audit log before it takes effect.
 */
async function recordFraudFlagDecision(claimId, indicators, recordDecision) {
    const overallConfidence = indicators.length > 0
        ? Math.max(...indicators.map((i) => i.confidenceScore))
        : null;
    return recordDecision({
        decisionType: 'FraudFlag',
        claimId,
        inputs: { indicatorCount: indicators.length },
        confidenceScore: overallConfidence,
        timestamp: new Date().toISOString(),
        fraudIndicators: indicators,
        actorType: 'System',
        actorId: null,
    });
}
/**
 * Records a fraud analyst review decision to the audit log before it takes effect.
 */
async function recordFraudAnalystDecision(claimId, analystId, decision, recordDecision) {
    return recordDecision({
        decisionType: 'FraudFlag',
        claimId,
        inputs: { analystDecision: decision },
        confidenceScore: null,
        timestamp: new Date().toISOString(),
        fraudIndicators: null,
        actorType: 'FraudAnalyst',
        actorId: analystId,
    });
}
//# sourceMappingURL=auditIntegration.js.map