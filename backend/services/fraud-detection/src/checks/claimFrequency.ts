/**
 * Claim frequency fraud check.
 *
 * Implements Requirement 6.1 / design.md "Fraud Detection Service" ->
 * "Frequency check": query the Claims table for how many claims a given
 * policy or customer has filed within the configured
 * `fraudFrequencyWindowDays`, and identify a claim-frequency
 * `Fraud_Indicator` when that count *exceeds* `fraudFrequencyThreshold`.
 *
 * The actual DynamoDB GSI query against the `Claims` table (owned by
 * services/orchestrator, task 3.1) is deliberately NOT reimplemented here.
 * Instead, this module depends on an injectable `ClaimHistoryQuery`
 * boundary that a caller (e.g. the orchestrator's Fraud Detection Lambda)
 * satisfies with a real DynamoDB-backed implementation. This keeps the
 * decision logic in this package pure and independently testable (per the
 * design's "mocking boundary" testing guidance).
 */
import type { ConfidenceScore, FraudIndicatorRecord, ISODateTimeString, SystemConfig } from '@claims/shared';

/**
 * The claim-frequency Fraud_Indicator type recorded on
 * `FraudIndicatorRecord.type` when this check fires.
 */
export const CLAIM_FREQUENCY_INDICATOR_TYPE = 'ClaimFrequency';

/**
 * Mockable boundary abstracting the Claims table query needed by the
 * frequency check. A real implementation queries the `PolicyNumberIndex`
 * (or an equivalent customer-id index) on the `Claims` table for claims
 * whose incident/creation date falls within the requested window; this
 * module has no knowledge of DynamoDB, GSIs, or table names.
 */
export interface ClaimHistoryQuery {
  /**
   * Returns the number of claims associated with `policyOrCustomerId`
   * that fall within the trailing `windowDays`-day window ending at
   * `asOf` (inclusive of `asOf`, exclusive of the window's lower bound
   * per the implementation's own boundary handling -- callers only need
   * to return a count, not the underlying claim records).
   */
  countClaimsWithinWindow(
    policyOrCustomerId: string,
    windowDays: number,
    asOf: Date,
  ): Promise<number> | number;
}

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
function computeFrequencyConfidence(count: number, threshold: number): ConfidenceScore {
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
export async function checkClaimFrequency(
  policyOrCustomerId: string,
  claimHistoryQuery: ClaimHistoryQuery,
  config: SystemConfig,
  asOf: Date = new Date(),
): Promise<FraudIndicatorRecord | null> {
  const count = await claimHistoryQuery.countClaimsWithinWindow(
    policyOrCustomerId,
    config.fraudFrequencyWindowDays,
    asOf,
  );

  if (count <= config.fraudFrequencyThreshold) {
    return null;
  }

  const detectedAt: ISODateTimeString = asOf.toISOString();

  return {
    type: CLAIM_FREQUENCY_INDICATOR_TYPE,
    confidenceScore: computeFrequencyConfidence(count, config.fraudFrequencyThreshold),
    detectedAt,
  };
}
