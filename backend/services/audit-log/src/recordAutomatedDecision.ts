/**
 * `recordAutomatedDecision`: records a single `Automated_Decision` as an
 * append-only `AuditLogRecord`.
 *
 * Every decision-producing component (the intake agent's field-confirmation
 * decisions, Damage Assessment, Fraud Detection, adjuster/analyst decision
 * handlers, Payout, Dispute resolution) calls this synchronously, in-line,
 * before applying the decision's side effect (see design.md: "6. Audit Log
 * Service"; the audit-write-precedes-effect wrapper, task 2.4, builds on top
 * of this).
 *
 * `recordAutomatedDecision` itself is only responsible for shaping and
 * persisting the record (Requirement 8.1: decision type, inputs,
 * `Confidence_Score`, `Claim_ID`, timestamp; Requirement 8.3: `Fraud_Indicator`s
 * and their `Confidence_Score`s when present). It generates a fresh
 * ULID-based `logId` for every call and delegates the actual write --
 * including the append-only/duplicate-key enforcement from Requirement 8.2
 * -- to the `AuditLogRepository` from task 2.1.
 *
 * See design.md: "6. Audit Log Service"; Data Models: AuditLogRecord.
 * Property 30: Automated decision audit completeness.
 *
 * _Requirements: 8.1, 8.3_
 */
import { ulid } from 'ulid';
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
export const DEFAULT_ACTOR_TYPE: ActorType = 'System';

/**
 * Builds the `AuditLogRecord` for a `recordAutomatedDecision` call,
 * generating a fresh ULID `logId` and applying defaults for the optional
 * fraud-indicator and actor fields.
 */
export function buildAuditLogRecord(input: RecordAutomatedDecisionInput): AuditLogRecord {
  return {
    logId: ulid(),
    claimId: input.claimId,
    decisionType: input.decisionType,
    inputs: input.inputs,
    confidenceScore: input.confidenceScore,
    fraudIndicators: input.fraudIndicators ?? null,
    timestamp: input.timestamp,
    actorType: input.actorType ?? DEFAULT_ACTOR_TYPE,
    actorId: input.actorId ?? null,
  };
}

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
export async function recordAutomatedDecision(
  input: RecordAutomatedDecisionInput,
  repository: AuditLogRepository,
): Promise<AuditLogRecord> {
  const record = buildAuditLogRecord(input);
  await repository.putAuditLogRecord(record);
  return record;
}
