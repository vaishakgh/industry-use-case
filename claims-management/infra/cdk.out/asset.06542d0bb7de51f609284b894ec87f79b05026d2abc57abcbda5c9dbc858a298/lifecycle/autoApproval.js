"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAutoApproval = evaluateAutoApproval;
const SEVERITY_ORDER = {
    Low: 0,
    Medium: 1,
    High: 2,
};
/**
 * Evaluates whether a claim qualifies for automatic approval.
 *
 * _Requirements: 5.1, 5.2, 5.3_
 */
function evaluateAutoApproval(input, config) {
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
//# sourceMappingURL=autoApproval.js.map