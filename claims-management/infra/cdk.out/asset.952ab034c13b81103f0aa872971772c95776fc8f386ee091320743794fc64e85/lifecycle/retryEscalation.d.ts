/**
 * Stage retry/backoff and persistent-failure escalation.
 *
 * Classifies failures as transient or persistent, retries transient
 * failures with configured backoff up to stageRetryMaxAttempts, and
 * escalates to Pending_Adjuster_Review when retries are exhausted.
 *
 * _Requirements: 7.2, 7.3_
 */
import type { SystemConfig } from '@claims/shared';
/** The two failure classifications per the design. */
export type FailureType = 'TransientFailure' | 'PersistentFailure';
/** Classification result for a stage failure. */
export interface FailureClassification {
    type: FailureType;
    errorName: string;
    message: string;
}
/** The decision after evaluating a failure against retry policy. */
export type RetryDecision = {
    action: 'retry';
    attemptNumber: number;
    backoffMs: number;
} | {
    action: 'escalate';
    reason: string;
};
/**
 * Classifies a stage failure as transient or persistent based on the
 * error name/type.
 */
export declare function classifyFailure(errorName: string, message: string): FailureClassification;
/**
 * Evaluates whether to retry or escalate given the failure classification
 * and current attempt count.
 *
 * Decision logic:
 * - Persistent failure → immediate escalation (Req 7.3)
 * - Transient failure + attempts < max → retry with backoff (Req 7.2)
 * - Transient failure + attempts >= max → escalate (Req 7.2, 7.3)
 *
 * Backoff is a simple fixed-interval scheme: attemptNumber * backoffSeconds.
 */
export declare function evaluateRetryDecision(classification: FailureClassification, currentAttempt: number, config: SystemConfig): RetryDecision;
//# sourceMappingURL=retryEscalation.d.ts.map