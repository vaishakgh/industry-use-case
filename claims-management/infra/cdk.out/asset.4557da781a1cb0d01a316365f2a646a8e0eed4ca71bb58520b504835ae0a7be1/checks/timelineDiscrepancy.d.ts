/**
 * Timeline discrepancy fraud check.
 *
 * Cross-validates incident date, incident location, and event-sequence
 * metadata for internal inconsistency. A discrepancy indicator is
 * produced when the claim's timeline doesn't add up.
 *
 * _Requirements: 6.2_
 */
import type { FraudIndicatorRecord } from '@claims/shared';
export declare const TIMELINE_DISCREPANCY_INDICATOR_TYPE = "TimelineDiscrepancy";
/** The claim's timeline data needed for the discrepancy check. */
export interface ClaimTimelineData {
    /** Reported incident date (ISO-8601). */
    incidentDate: string;
    /** Date the claim was filed/created (ISO-8601). */
    claimCreatedDate: string;
    /** Date of earliest evidence (photo upload, document, etc.) if available. */
    earliestEvidenceDate?: string;
    /** The policy's effective start date (ISO-8601), if available. */
    policyStartDate?: string;
}
/**
 * Evaluates the timeline discrepancy fraud check for a claim.
 *
 * Returns a `FraudIndicatorRecord` if any discrepancies are found,
 * with a confidence score based on the severity of the worst discrepancy.
 * Returns null if the timeline is consistent.
 *
 * _Requirements: 6.2_
 */
export declare function checkTimelineDiscrepancy(timelineData: ClaimTimelineData, asOf?: Date): FraudIndicatorRecord | null;
//# sourceMappingURL=timelineDiscrepancy.d.ts.map