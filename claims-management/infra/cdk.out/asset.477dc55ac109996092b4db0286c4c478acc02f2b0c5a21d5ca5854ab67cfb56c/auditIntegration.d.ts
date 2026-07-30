/**
 * Audit integration for Fraud Detection decisions.
 *
 * Calls the audit-write-precedes-effect pattern before applying a fraud
 * flag or analyst decision to a Claim.
 *
 * _Requirements: 8.1, 8.3, 8.6_
 */
import type { AuditLogRecord, FraudIndicatorRecord, ISODateTimeString } from '@claims/shared';
import type { FraudAnalystDecision } from './resolveFraudReview';
/**
 * Audit record function contract matching the recordDecisionBeforeEffect
 * wrapper from @claims/audit-log.
 */
export interface RecordFraudDecisionFn {
    (input: {
        decisionType: 'FraudFlag';
        claimId: string;
        inputs: Record<string, unknown>;
        confidenceScore: number | null;
        timestamp: ISODateTimeString;
        fraudIndicators: FraudIndicatorRecord[] | null;
        actorType: 'System' | 'FraudAnalyst';
        actorId: string | null;
    }): Promise<AuditLogRecord>;
}
/**
 * Records a fraud flag decision to the audit log before it takes effect.
 */
export declare function recordFraudFlagDecision(claimId: string, indicators: FraudIndicatorRecord[], recordDecision: RecordFraudDecisionFn): Promise<AuditLogRecord>;
/**
 * Records a fraud analyst review decision to the audit log before it takes effect.
 */
export declare function recordFraudAnalystDecision(claimId: string, analystId: string, decision: FraudAnalystDecision, recordDecision: RecordFraudDecisionFn): Promise<AuditLogRecord>;
//# sourceMappingURL=auditIntegration.d.ts.map