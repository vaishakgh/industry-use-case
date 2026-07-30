/**
 * Auto-approval decision logic.
 *
 * Implements the decision table over (fraudFlag, severityRating,
 * estimatedRepairCost) against the Auto_Approval_Threshold.
 *
 * A claim is auto-approved iff:
 * 1. No fraud flag is present (Req 5.1)
 * 2. Severity rating is at or below the threshold (Req 5.2)
 * 3. Estimated repair cost is at or below the threshold (Req 5.3)
 *
 * Otherwise, the claim is routed to a human adjuster.
 *
 * _Requirements: 5.1, 5.2, 5.3_
 */
import type { SeverityRating, SystemConfig } from '@claims/shared';

const SEVERITY_ORDER: Record<SeverityRating, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
};

/** Input to the auto-approval decision. */
export interface ApprovalInput {
  fraudFlag: boolean;
  severityRating: SeverityRating | null;
  estimatedRepairCost: number | null;
}

/** The auto-approval decision result. */
export type ApprovalDecision =
  | { approved: true }
  | { approved: false; reason: string };

/**
 * Evaluates whether a claim qualifies for automatic approval.
 *
 * _Requirements: 5.1, 5.2, 5.3_
 */
export function evaluateAutoApproval(
  input: ApprovalInput,
  config: SystemConfig,
): ApprovalDecision {
  // Req 5.1: No fraud flag
  if (input.fraudFlag) {
    return { approved: false, reason: 'Claim has an active fraud flag' };
  }

  // If severity or cost is null (assessment not completed), cannot auto-approve
  if (input.severityRating === null) {
    return { approved: false, reason: 'Severity rating is not available' };
  }
  if (input.estimatedRepairCost === null) {
    return { approved: false, reason: 'Estimated repair cost is not available' };
  }

  const { maxSeverityRating, maxEstimatedRepairCost } = config.autoApprovalThreshold;

  // Req 5.2: Severity at or below threshold
  if (SEVERITY_ORDER[input.severityRating] > SEVERITY_ORDER[maxSeverityRating]) {
    return {
      approved: false,
      reason: `Severity rating ${input.severityRating} exceeds auto-approval threshold ${maxSeverityRating}`,
    };
  }

  // Req 5.3: Cost at or below threshold
  if (input.estimatedRepairCost > maxEstimatedRepairCost) {
    return {
      approved: false,
      reason: `Estimated repair cost ${input.estimatedRepairCost} exceeds auto-approval threshold ${maxEstimatedRepairCost}`,
    };
  }

  return { approved: true };
}
