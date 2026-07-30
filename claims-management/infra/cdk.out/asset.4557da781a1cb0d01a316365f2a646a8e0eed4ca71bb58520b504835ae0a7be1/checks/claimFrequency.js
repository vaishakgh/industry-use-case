"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAIM_FREQUENCY_INDICATOR_TYPE = void 0;
exports.checkClaimFrequency = checkClaimFrequency;
/**
 * The claim-frequency Fraud_Indicator type recorded on
 * `FraudIndicatorRecord.type` when this check fires.
 */
exports.CLAIM_FREQUENCY_INDICATOR_TYPE = 'ClaimFrequency';
/**
 * Computes a [0, 1] confidence score for a claim-frequency indicator,
 * scaled by how far the observed count is past the configured threshold.
 *
 * A count exactly at the threshold never reaches this function (see
 * `checkClaimFrequency`), so `count` here is always strictly greater than
 * `threshold`. The score reaches 1.0 once the count is at least double
 * the threshold (or, when `threshold` is 0, as soon as any claim exists),
 * giving a smooth gradient between "just over the line" and "clearly
 * excessive" rather than a flat constant.
 */
function computeFrequencyConfidence(count, threshold) {
    const denominator = Math.max(threshold, 1);
    const rawConfidence = (count - threshold) / denominator;
    return Math.min(1, Math.max(0, rawConfidence));
}
/**
 * Evaluates the claim frequency fraud check for a policy or customer.
 *
 * Per Requirement 6.1 and Property 21, this identifies a claim-frequency
 * `Fraud_Indicator` if and only if the number of claims within the
 * configured window *exceeds* (strictly greater than) the configured
 * threshold. A count exactly equal to the threshold does NOT trigger the
 * indicator -- "exceeds" is interpreted as a strict inequality, so the
 * threshold itself is the last still-acceptable count.
 *
 * @param policyOrCustomerId the policy number or customer id to evaluate
 * @param claimHistoryQuery the injectable Claims-table query boundary
 * @param config the SystemConfig providing `fraudFrequencyThreshold` and
 *   `fraudFrequencyWindowDays`
 * @param asOf the reference time the window is measured back from
 *   (defaults to now); accepted as a parameter so callers/tests can pin
 *   down a deterministic window boundary
 * @returns a `FraudIndicatorRecord` describing the frequency indicator if
 *   the threshold is exceeded, or `null` if it is not
 */
async function checkClaimFrequency(policyOrCustomerId, claimHistoryQuery, config, asOf = new Date()) {
    const count = await claimHistoryQuery.countClaimsWithinWindow(policyOrCustomerId, config.fraudFrequencyWindowDays, asOf);
    if (count <= config.fraudFrequencyThreshold) {
        return null;
    }
    const detectedAt = asOf.toISOString();
    return {
        type: exports.CLAIM_FREQUENCY_INDICATOR_TYPE,
        confidenceScore: computeFrequencyConfidence(count, config.fraudFrequencyThreshold),
        detectedAt,
    };
}
//# sourceMappingURL=claimFrequency.js.map