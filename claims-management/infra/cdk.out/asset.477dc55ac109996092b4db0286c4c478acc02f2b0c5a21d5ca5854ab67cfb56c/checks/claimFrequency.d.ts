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
import type { FraudIndicatorRecord, SystemConfig } from '@claims/shared';
/**
 * The claim-frequency Fraud_Indicator type recorded on
 * `FraudIndicatorRecord.type` when this check fires.
 */
export declare const CLAIM_FREQUENCY_INDICATOR_TYPE = "ClaimFrequency";
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
    countClaimsWithinWindow(policyOrCustomerId: string, windowDays: number, asOf: Date): Promise<number> | number;
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
export declare function checkClaimFrequency(policyOrCustomerId: string, claimHistoryQuery: ClaimHistoryQuery, config: SystemConfig, asOf?: Date): Promise<FraudIndicatorRecord | null>;
//# sourceMappingURL=claimFrequency.d.ts.map