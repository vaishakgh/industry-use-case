"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMELINE_DISCREPANCY_INDICATOR_TYPE = void 0;
exports.checkTimelineDiscrepancy = checkTimelineDiscrepancy;
exports.TIMELINE_DISCREPANCY_INDICATOR_TYPE = 'TimelineDiscrepancy';
function findDiscrepancies(data) {
    const discrepancies = [];
    const incidentTime = new Date(data.incidentDate).getTime();
    const claimCreatedTime = new Date(data.claimCreatedDate).getTime();
    // Check 1: Incident date is in the future relative to when the claim was filed
    if (incidentTime > claimCreatedTime) {
        discrepancies.push({
            check: 'future_incident',
            description: 'Reported incident date is after the claim creation date',
            severity: 0.9,
        });
    }
    // Check 2: Incident date is before the policy start date
    if (data.policyStartDate) {
        const policyStartTime = new Date(data.policyStartDate).getTime();
        if (incidentTime < policyStartTime) {
            discrepancies.push({
                check: 'pre_policy_incident',
                description: 'Reported incident date is before the policy effective start date',
                severity: 0.95,
            });
        }
    }
    // Check 3: Evidence predates the reported incident
    if (data.earliestEvidenceDate) {
        const evidenceTime = new Date(data.earliestEvidenceDate).getTime();
        if (evidenceTime < incidentTime) {
            // Evidence was created before the incident supposedly happened
            discrepancies.push({
                check: 'evidence_predates_incident',
                description: 'Earliest evidence predates the reported incident date',
                severity: 0.8,
            });
        }
    }
    return discrepancies;
}
/**
 * Evaluates the timeline discrepancy fraud check for a claim.
 *
 * Returns a `FraudIndicatorRecord` if any discrepancies are found,
 * with a confidence score based on the severity of the worst discrepancy.
 * Returns null if the timeline is consistent.
 *
 * _Requirements: 6.2_
 */
function checkTimelineDiscrepancy(timelineData, asOf = new Date()) {
    const discrepancies = findDiscrepancies(timelineData);
    if (discrepancies.length === 0) {
        return null;
    }
    // Confidence is the maximum severity among all discrepancies found
    const confidenceScore = Math.max(...discrepancies.map((d) => d.severity));
    const detectedAt = asOf.toISOString();
    return {
        type: exports.TIMELINE_DISCREPANCY_INDICATOR_TYPE,
        confidenceScore,
        detectedAt,
    };
}
//# sourceMappingURL=timelineDiscrepancy.js.map