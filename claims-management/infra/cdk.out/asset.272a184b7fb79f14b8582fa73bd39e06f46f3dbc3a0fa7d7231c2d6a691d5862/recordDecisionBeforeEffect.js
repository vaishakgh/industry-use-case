"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimsAuditFailureError = exports.CLAIMS_AUDIT_FAILURE_ERROR_NAME = void 0;
exports.recordDecisionBeforeEffect = recordDecisionBeforeEffect;
const recordAutomatedDecision_1 = require("./recordAutomatedDecision");
/** Step Functions error name used for `ClaimsAuditFailureError` instances. */
exports.CLAIMS_AUDIT_FAILURE_ERROR_NAME = 'Claims.AuditFailure';
/**
 * Raised by `recordDecisionBeforeEffect` when the underlying audit write
 * fails for any reason (a genuine `AuditLogAccessError`, a
 * `AuditLogDuplicateRecordError`, or any other error thrown by the
 * repository/`recordAutomatedDecision`). Callers MUST treat this as "the
 * decision did not take effect" -- the decision's side effect must not be
 * applied.
 *
 * `name` is set to `Claims.AuditFailure` (see
 * `CLAIMS_AUDIT_FAILURE_ERROR_NAME`) so that it maps directly onto the
 * `Claims.AuditFailure` Step Functions error name used in the Claims
 * Orchestrator's `Catch` blocks (see design.md Error Handling).
 */
class ClaimsAuditFailureError extends Error {
    claimId;
    cause;
    constructor(claimId, cause) {
        super(`Audit write failed for claimId "${claimId}"; the decision must not take effect: ${errorMessage(cause)}`);
        this.claimId = claimId;
        this.cause = cause;
        this.name = exports.CLAIMS_AUDIT_FAILURE_ERROR_NAME;
        Object.setPrototypeOf(this, ClaimsAuditFailureError.prototype);
    }
}
exports.ClaimsAuditFailureError = ClaimsAuditFailureError;
/**
 * Invokes `recordAutomatedDecision` synchronously and only returns the
 * persisted `AuditLogRecord` (signalling the caller may now apply the
 * decision's side effect) if the write succeeds.
 *
 * @param input The decision to record, per `RecordAutomatedDecisionInput`.
 * @param repository The `AuditLogRepository` to write through.
 * @returns The persisted `AuditLogRecord`. The caller MAY proceed to apply
 *   the decision's side effect once this resolves.
 * @throws {ClaimsAuditFailureError} if the audit write fails for any
 *   reason. The caller MUST NOT apply the decision's side effect in this
 *   case.
 */
async function recordDecisionBeforeEffect(input, repository) {
    try {
        return await (0, recordAutomatedDecision_1.recordAutomatedDecision)(input, repository);
    }
    catch (error) {
        throw new ClaimsAuditFailureError(input.claimId, error);
    }
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=recordDecisionBeforeEffect.js.map