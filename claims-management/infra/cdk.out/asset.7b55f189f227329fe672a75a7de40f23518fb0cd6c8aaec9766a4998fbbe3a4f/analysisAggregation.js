"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregatePhotoAnalysis = aggregatePhotoAnalysis;
/** Severity ordering for aggregation: take the highest severity across photos. */
const SEVERITY_ORDER = {
    Low: 0,
    Medium: 1,
    High: 2,
};
function maxSeverity(a, b) {
    return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}
/**
 * Analyzes all photos associated with a claim and aggregates the results
 * into a single assessment.
 *
 * Aggregation rules:
 * - Severity: highest severity across all photos (worst-case)
 * - Estimated repair cost: sum of per-photo costs (total damage)
 * - Confidence: minimum confidence across all photos (weakest link)
 *
 * If any photo has insufficient quality, returns a `quality_issue` outcome
 * so the caller can request resubmission.
 *
 * _Requirements: 4.2, 4.3_
 */
async function aggregatePhotoAnalysis(photoRefs, client) {
    if (photoRefs.length === 0) {
        return { status: 'analysis_failure', error: 'No photos to analyze' };
    }
    const results = [];
    const insufficientPhotoRefs = [];
    for (const ref of photoRefs) {
        try {
            const analysis = await client.analyzePhoto(ref);
            if (!analysis.qualitySufficient) {
                insufficientPhotoRefs.push(ref);
            }
            results.push(analysis);
        }
        catch (error) {
            return {
                status: 'analysis_failure',
                error: error instanceof Error ? error.message : 'Unknown analysis error',
            };
        }
    }
    // If any photos had quality issues, report for resubmission
    if (insufficientPhotoRefs.length > 0) {
        return { status: 'quality_issue', insufficientPhotoRefs };
    }
    // Aggregate: highest severity, sum of costs, min confidence
    let aggregatedSeverity = results[0].severityRating;
    let totalCost = 0;
    let minConfidence = 1;
    for (const result of results) {
        aggregatedSeverity = maxSeverity(aggregatedSeverity, result.severityRating);
        totalCost += result.estimatedRepairCost;
        minConfidence = Math.min(minConfidence, result.confidenceScore);
    }
    return {
        status: 'success',
        assessment: {
            severityRating: aggregatedSeverity,
            estimatedRepairCost: totalCost,
            confidenceScore: minConfidence,
        },
    };
}
//# sourceMappingURL=analysisAggregation.js.map