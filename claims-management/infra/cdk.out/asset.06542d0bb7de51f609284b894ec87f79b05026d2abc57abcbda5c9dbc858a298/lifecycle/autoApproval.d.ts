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
/** Input to the auto-approval decision. */
export interface ApprovalInput {
    fraudFlag: boolean;
    severityRating: SeverityRating | null;
    estimatedRepairCost: number | null;
}
/** The auto-approval decision result. */
export type ApprovalDecision = {
    approved: true;
} | {
    approved: false;
    reason: string;
};
/**
 * Evaluates whether a claim qualifies for automatic approval.
 *
 * _Requirements: 5.1, 5.2, 5.3_
 */
export declare function evaluateAutoApproval(input: ApprovalInput, config: SystemConfig): ApprovalDecision;
//# sourceMappingURL=autoApproval.d.ts.map