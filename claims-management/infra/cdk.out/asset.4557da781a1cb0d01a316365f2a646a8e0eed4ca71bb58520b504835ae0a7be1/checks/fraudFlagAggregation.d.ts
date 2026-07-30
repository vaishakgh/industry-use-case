/**
 * Fraud flag aggregation from indicators.
 *
 * Applies a Fraud_Flag to a claim if and only if the set of identified
 * fraud indicators is non-empty, recording every indicator with its
 * confidence score.
 *
 * _Requirements: 6.4_
 */
import type { FraudIndicatorRecord } from '@claims/shared';
/** The result of running fraud detection on a claim. */
export interface FraudDetectionResult {
    /** Whether the claim should be flagged. True iff indicators is non-empty. */
    fraudFlagged: boolean;
    /** All identified fraud indicators (empty array if not flagged). */
    indicators: FraudIndicatorRecord[];
}
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
export declare function aggregateFraudIndicators(indicators: FraudIndicatorRecord[]): FraudDetectionResult;
//# sourceMappingURL=fraudFlagAggregation.d.ts.map