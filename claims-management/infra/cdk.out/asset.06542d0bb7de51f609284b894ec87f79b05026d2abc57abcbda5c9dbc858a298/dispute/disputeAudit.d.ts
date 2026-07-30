/**
 * Dispute resolution audit event recording.
 *
 * Records the original decision, revised decision, and adjuster identity
 * via the Audit Log Service when a Disputed Claim is Resolved.
 *
 * _Requirements: 11.6_
 */
import type { AuditLogRecord, DecisionOutcome, ISODateTimeString } from '@claims/shared';
/**
 * The audit record function contract for dispute resolution.
 */
export interface RecordDisputeAuditFn {
    (input: {
        decisionType: 'DisputeResolution';
        claimId: string;
        inputs: Record<string, unknown>;
        confidenceScore: null;
        timestamp: ISODateTimeString;
        fraudIndicators: null;
        actorType: 'HumanAdjuster';
        actorId: string;
    }): Promise<AuditLogRecord>;
}
/**
 * Records the dispute resolution to the audit log.
 *
 * Captures the original decision, revised decision, and the resolving
 * adjuster's identity.
 *
 * @param claimId The claim that was disputed
 * @param originalDecision The decision that was originally made
 * @param revisedDecision The adjuster's revised decision
 * @param adjusterId The resolving adjuster's identity
 * @param recordDecision The audit-write-precedes-effect function
 */
export declare function recordDisputeResolutionAudit(claimId: string, originalDecision: DecisionOutcome, revisedDecision: DecisionOutcome, adjusterId: string, recordDecision: RecordDisputeAuditFn): Promise<AuditLogRecord>;
//# sourceMappingURL=disputeAudit.d.ts.map