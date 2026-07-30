/**
 * GET /claims/{id} status/history endpoint.
 *
 * Returns the Claim's current claimStatus together with its complete
 * statusHistory.
 *
 * _Requirements: 10.1_
 */
import type { ClaimStatus, StatusHistoryEntry } from '@claims/shared';

/** The response shape for the claim status endpoint. */
export interface ClaimStatusResponse {
  claimId: string;
  currentStatus: ClaimStatus;
  statusHistory: StatusHistoryEntry[];
}

/**
 * Builds the claim status response from claim data.
 * Passes through the status and history without mutation.
 */
export function buildClaimStatusResponse(
  claimId: string,
  currentStatus: ClaimStatus,
  statusHistory: StatusHistoryEntry[],
): ClaimStatusResponse {
  return {
    claimId,
    currentStatus,
    statusHistory,
  };
}
