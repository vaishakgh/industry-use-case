/**
 * Dispute submission validation.
 *
 * Accepts a dispute if and only if Claim_Status is Approved or Denied
 * and the reason is non-empty and within maxDisputeReasonLength.
 *
 * _Requirements: 11.1, 11.4, 11.5_
 */
import type { ClaimStatus, SystemConfig, ISODateTimeString, DecisionOutcome } from '@claims/shared';

/** Input to the dispute submission handler. */
export interface DisputeSubmissionInput {
  claimId: string;
  claimStatus: ClaimStatus;
  reason: string;
  originalDecision: DecisionOutcome;
  customerId: string;
  timestamp?: ISODateTimeString;
}

/** Dispute submission validation result. */
export type DisputeSubmissionResult =
  | { accepted: true; disputeRecord: { reason: string; submittedAt: ISODateTimeString; originalDecision: DecisionOutcome } }
  | { accepted: false; rejectionReason: string };

/** Statuses that permit dispute submission. */
export const DISPUTABLE_STATUSES: ClaimStatus[] = ['Approved', 'Denied'];

/**
 * Validates and processes a dispute submission.
 *
 * Validation rules:
 * 1. Claim_Status must be Approved or Denied (Req 11.4)
 * 2. Reason must be non-empty (Req 11.5)
 * 3. Reason must be within maxDisputeReasonLength (Req 11.5)
 *
 * _Requirements: 11.1, 11.4, 11.5_
 */
export function validateDisputeSubmission(
  input: DisputeSubmissionInput,
  config: SystemConfig,
): DisputeSubmissionResult {
  // Req 11.4: Status must be Approved or Denied
  if (!DISPUTABLE_STATUSES.includes(input.claimStatus)) {
    return {
      accepted: false,
      rejectionReason: `Dispute submission is only allowed for claims with status Approved or Denied. Current status: ${input.claimStatus}`,
    };
  }

  // Req 11.5: Reason must be non-empty
  const trimmedReason = input.reason.trim();
  if (trimmedReason.length === 0) {
    return {
      accepted: false,
      rejectionReason: 'Dispute reason must not be empty.',
    };
  }

  // Req 11.5: Reason must be within max length
  if (trimmedReason.length > config.maxDisputeReasonLength) {
    return {
      accepted: false,
      rejectionReason: `Dispute reason exceeds the maximum allowed length of ${config.maxDisputeReasonLength} characters.`,
    };
  }

  const timestamp = input.timestamp ?? new Date().toISOString();

  return {
    accepted: true,
    disputeRecord: {
      reason: trimmedReason,
      submittedAt: timestamp,
      originalDecision: input.originalDecision,
    },
  };
}
