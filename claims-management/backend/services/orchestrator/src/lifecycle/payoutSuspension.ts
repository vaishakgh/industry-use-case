/**
 * Payout suspension check for fraud-flagged claims.
 *
 * Prevents the Payout stage from executing while the claim has an active
 * fraud flag and no analyst decision has been recorded.
 *
 * _Requirements: 6.5_
 */

/** The state needed to evaluate payout eligibility. */
export interface PayoutEligibilityInput {
  fraudFlag: boolean;
  fraudAnalystId: string | null;
}

/** Whether payout can proceed or must be suspended. */
export type PayoutEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

/**
 * Evaluates whether a claim is eligible for payout.
 *
 * Per Requirement 6.5 / Property 24:
 * - If `fraudFlag` is true AND no analyst decision is recorded
 *   (`fraudAnalystId` is null), payout is suspended.
 * - If `fraudFlag` is false OR an analyst has already reviewed
 *   (and cleared the flag), payout may proceed.
 *
 * _Requirements: 6.5_
 */
export function checkPayoutEligibility(input: PayoutEligibilityInput): PayoutEligibility {
  if (input.fraudFlag && input.fraudAnalystId === null) {
    return {
      eligible: false,
      reason: 'Payout suspended: claim is fraud-flagged and awaiting analyst review',
    };
  }
  return { eligible: true };
}
