/**
 * Audit-write-precedes-effect wrapper.
 *
 * Every decision-producing component (the intake agent's field-confirmation
 * decisions, Damage Assessment, Fraud Detection, adjuster/analyst decision
 * handlers, Payout, Dispute resolution) MUST call `recordDecisionBeforeEffect`
 * -- rather than `recordAutomatedDecision` directly -- immediately before
 * applying that decision's side effect (a Claim_Status change, a payout
 * trigger, applying a Fraud_Flag, etc).
 *
 * It invokes `recordAutomatedDecision` (task 2.2) synchronously and only
 * returns the persisted `AuditLogRecord` -- signalling to the caller that it
 * is safe to apply the decision's side effect -- if the underlying write
 * succeeds. If the write fails for any reason, it throws a
 * `ClaimsAuditFailureError` (name `Claims.AuditFailure`) instead of the raw
 * underlying error, so that:
 *  - callers can catch specifically this error type to know the decision
 *    must NOT take effect (Requirement 8.6, Property 33), and
 *  - the Claims Orchestrator's Step Functions `Catch` blocks can match on
 *    the `Claims.AuditFailure` error name (see design.md Error Handling and
 *    Architecture: "Claims Orchestrator") to escalate to manual review,
 *    since compliance-safe automation could not complete.
 *
 * See design.md: "6. Audit Log Service" ("The calling component only
 * proceeds with the decision's side effects ... after the audit write
 * succeeds; on failure, the component raises `Claims.AuditFailure`") and
 * Error Handling: `Claims.AuditFailure`.
 *
 * _Requirements: 8.6_
 */
import type { AuditLogRecord } from '@claims/shared';
import type { AuditLogRepository } from './repository/auditLogRepository';
import { recordAutomatedDecision, type RecordAutomatedDecisionInput } from './recordAutomatedDecision';

/** Step Functions error name used for `ClaimsAuditFailureError` instances. */
export const CLAIMS_AUDIT_FAILURE_ERROR_NAME = 'Claims.AuditFailure';

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
export class ClaimsAuditFailureError extends Error {
  constructor(
    public readonly claimId: string,
    public override readonly cause?: unknown,
  ) {
    super(
      `Audit write failed for claimId "${claimId}"; the decision must not take effect: ${errorMessage(cause)}`,
    );
    this.name = CLAIMS_AUDIT_FAILURE_ERROR_NAME;
    Object.setPrototypeOf(this, ClaimsAuditFailureError.prototype);
  }
}

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
export async function recordDecisionBeforeEffect(
  input: RecordAutomatedDecisionInput,
  repository: AuditLogRepository,
): Promise<AuditLogRecord> {
  try {
    return await recordAutomatedDecision(input, repository);
  } catch (error) {
    throw new ClaimsAuditFailureError(input.claimId, error);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
