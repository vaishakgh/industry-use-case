/**
 * Adjuster decision recording handler.
 *
 * Sets Claim_Status to Approved or Denied per the adjuster's decision
 * and records the adjuster's identity.
 *
 * _Requirements: 5.4, 5.5_
 */
import type { ClaimStatus, ISODateTimeString } from '@claims/shared';

/** The adjuster's decision on a claim. */
export type AdjusterDecisionType = 'approve' | 'deny';

/** Input to the adjuster decision handler. */
export interface AdjusterDecisionInput {
  claimId: string;
  adjusterId: string;
  decision: AdjusterDecisionType;
  timestamp?: ISODateTimeString;
}

/** The result of recording an adjuster decision. */
export interface AdjusterDecisionResult {
  claimId: string;
  adjusterId: string;
  decision: AdjusterDecisionType;
  newClaimStatus: ClaimStatus;
  timestamp: ISODateTimeString;
}

/**
 * Records a human adjuster's decision on a claim.
 *
 * _Requirements: 5.4, 5.5_
 */
export function recordAdjusterDecision(input: AdjusterDecisionInput): AdjusterDecisionResult {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const newClaimStatus: ClaimStatus = input.decision === 'approve' ? 'Approved' : 'Denied';

  return {
    claimId: input.claimId,
    adjusterId: input.adjusterId,
    decision: input.decision,
    newClaimStatus,
    timestamp,
  };
}
