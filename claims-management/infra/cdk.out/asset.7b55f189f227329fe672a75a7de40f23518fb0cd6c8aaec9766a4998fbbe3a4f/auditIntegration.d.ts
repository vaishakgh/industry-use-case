/**
 * Audit integration for Damage Assessment decisions.
 *
 * Calls the audit-write-precedes-effect pattern before applying
 * assessment results to a Claim. Every Damage Assessment automated
 * decision (severity rating, cost estimate, confidence) is logged
 * to the audit trail before it is allowed to take effect.
 *
 * _Requirements: 8.1, 8.6_
 */
import type { AuditLogRecord, ISODateTimeString } from '@claims/shared';
import type { AggregatedAssessment } from './analysisAggregation';
/**
 * The audit-write-precedes-effect function contract. This matches the
 * `recordDecisionBeforeEffect` wrapper from @claims/audit-log (task 2.4).
 * The damage assessment service depends on this interface rather than
 * importing the audit-log package directly, keeping the dependency graph
 * acyclic and the boundary mockable in tests.
 */
export interface RecordDecisionBeforeEffectFn {
    (input: {
        decisionType: 'DamageAssessment';
        claimId: string;
        inputs: Record<string, unknown>;
        confidenceScore: number | null;
        timestamp: ISODateTimeString;
        fraudIndicators: null;
        actorType: 'System';
        actorId: null;
    }): Promise<AuditLogRecord>;
}
/**
 * Records a Damage Assessment decision to the audit log before allowing
 * it to take effect. If the audit write fails, the caller MUST NOT apply
 * the assessment to the Claim (per Req 8.6).
 *
 * @param claimId The claim being assessed
 * @param assessment The aggregated assessment result
 * @param photoRefs The photo references that were analyzed
 * @param recordDecision The audit-write-precedes-effect function
 * @returns The persisted audit log record
 * @throws ClaimsAuditFailureError if the audit write fails
 */
export declare function recordDamageAssessmentDecision(claimId: string, assessment: AggregatedAssessment, photoRefs: string[], recordDecision: RecordDecisionBeforeEffectFn): Promise<AuditLogRecord>;
//# sourceMappingURL=auditIntegration.d.ts.map