import type { ActorType, AuditLogRecord, ConfidenceScore, DecisionType, FraudIndicatorRecord } from '@claims/shared';
import type { AuditLogRepository } from './repository/auditLogRepository';
/**
 * Input to `recordAutomatedDecision`: every field of an `AuditLogRecord`
 * except the generated `logId`. `fraudIndicators`, `actorType`, and
 * `actorId` are optional -- callers that omit them get `null` and
 * `'System'` defaults respectively, matching an automated (non-human)
 * decision with no identified fraud indicators.
 */
export interface RecordAutomatedDecisionInput {
    decisionType: DecisionType;
    claimId: string;
    inputs: Record<string, unknown>;
    confidenceScore: ConfidenceScore | null;
    timestamp: string;
    fraudIndicators?: FraudIndicatorRecord[] | null;
    actorType?: ActorType;
    actorId?: string | null;
}
/** Default `actorType` used when the caller does not specify one. */
export declare const DEFAULT_ACTOR_TYPE: ActorType;
/**
 * Builds the `AuditLogRecord` for a `recordAutomatedDecision` call,
 * generating a fresh ULID `logId` and applying defaults for the optional
 * fraud-indicator and actor fields.
 */
export declare function buildAuditLogRecord(input: RecordAutomatedDecisionInput): AuditLogRecord;
/**
 * Records a single `Automated_Decision` by persisting a new `AuditLogRecord`
 * through the given `AuditLogRepository`.
 *
 * Generates a fresh ULID `logId`, shapes the record (Requirements 8.1,
 * 8.3), and persists it via `repository.putAuditLogRecord` (Requirement
 * 8.2's append-only guarantee is enforced by the repository).
 *
 * @returns The persisted `AuditLogRecord`, including its generated `logId`.
 * @throws {AuditLogDuplicateRecordError} in the astronomically unlikely
 *   event of a `logId` collision.
 * @throws {AuditLogAccessError} if the underlying write fails for any
 *   other reason.
 */
export declare function recordAutomatedDecision(input: RecordAutomatedDecisionInput, repository: AuditLogRepository): Promise<AuditLogRecord>;
//# sourceMappingURL=recordAutomatedDecision.d.ts.map