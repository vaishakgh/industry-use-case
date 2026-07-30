/**
 * @claims/audit-log
 *
 * Audit Log Service: records every Automated_Decision (decision type,
 * inputs, confidence score, Claim_ID, timestamp) as an append-only record,
 * exposes chronological per-claim retrieval gated to compliance officers,
 * and provides the audit-write-precedes-effect wrapper used by every
 * decision-producing component.
 *
 * The DynamoDB access layer (task 2.1) is exported below. Handler logic
 * (recordAutomatedDecision, the audit-write-precedes-effect wrapper, and
 * the query handler) is implemented in later tasks (2.x).
 */
export declare const AUDIT_LOG_PACKAGE_NAME = "@claims/audit-log";
export * from './repository/auditLogRepository';
export * from './recordAutomatedDecision';
export * from './recordDecisionBeforeEffect';
export * from './handlers/getAuditHistoryHandler';
//# sourceMappingURL=index.d.ts.map