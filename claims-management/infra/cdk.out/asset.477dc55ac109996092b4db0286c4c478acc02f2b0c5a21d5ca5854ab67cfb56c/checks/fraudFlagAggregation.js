"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateFraudIndicators = aggregateFraudIndicators;
/**
 * Aggregates fraud indicators into a flag decision.
 *
 * Per Requirement 6.4 / Property 23:
 * - A Fraud_Flag is applied if and only if the indicator set is non-empty
 * - Every indicator is recorded with its confidence score
 * - An empty indicator set means no flag
 *
 * @param indicators All fraud indicators identified by the various checks
 * @returns The aggregated fraud detection result
 */
function aggregateFraudIndicators(indicators) {
    return {
        fraudFlagged: indicators.length > 0,
        indicators,
    };
}
//# sourceMappingURL=fraudFlagAggregation.js.map