"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDamageAssessmentDecision = recordDamageAssessmentDecision;
/**
 * Records a Damage Assessment decision to the audit log before allowing
 * it to take effect. If the audit write fails, the caller MUST NOT apply
 * the assessment to the Claim (per Req 8.6).
 *
 * @param claimId The claim being assessed
 * @param assessment The aggregated assessment result
 * @param photoRefs The photo references that were analyzed
 * @param recordDecision The audit-write-precedes-effect function
 * @returns The persisted audit log record
 * @throws ClaimsAuditFailureError if the audit write fails
 */
async function recordDamageAssessmentDecision(claimId, assessment, photoRefs, recordDecision) {
    return recordDecision({
        decisionType: 'DamageAssessment',
        claimId,
        inputs: {
            photoRefs,
            severityRating: assessment.severityRating,
            estimatedRepairCost: assessment.estimatedRepairCost,
        },
        confidenceScore: assessment.confidenceScore,
        timestamp: new Date().toISOString(),
        fraudIndicators: null,
        actorType: 'System',
        actorId: null,
    });
}
//# sourceMappingURL=auditIntegration.js.map