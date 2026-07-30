/**
 * Session resume logic.
 *
 * Retrieves a `ClaimSession` by Claim_ID or policy number, returns the
 * previously captured `Structured_Claim_Fields` unchanged, and identifies
 * which fields still need clarification or confirmation — explicitly
 * suppressing any field already marked `confirmed`.
 *
 * See design.md: Property 11 (session resume preserves captured fields),
 * Property 12 (confirmed fields are never re-requested on resume).
 *
 * _Requirements: 3.1, 3.2, 3.3_
 */
import type { ClaimSession, StructuredClaimFields, StructuredFieldName } from '@claims/shared';
import type { ClaimSessionsTable } from '../claimSessions';
import { type LookupKey } from './lookupClaimSession';
/** The result of resuming a session, including which fields still require attention. */
export interface ResumeSessionResult {
    /** The looked-up session (unchanged). */
    session: ClaimSession;
    /** The structured fields as previously captured — never mutated by resume. */
    capturedFields: StructuredClaimFields;
    /**
     * Fields that still require clarification or confirmation from the customer.
     * This NEVER includes fields already marked `confirmed`.
     */
    pendingFields: StructuredFieldName[];
}
/**
 * Determines which structured fields from a claim still require attention
 * (are not yet resolved). A field is considered resolved if:
 * - It has a non-null `value` AND is marked `confirmed`, OR
 * - It has a non-null `value` AND its `confidenceScore` is at or above
 *   the given threshold (implicit confirmation by high confidence).
 *
 * Fields that are already `confirmed` are NEVER included in the pending
 * list, regardless of their value or confidence score (Property 12).
 */
export declare function getPendingFields(fields: StructuredClaimFields, fieldConfidenceThreshold: number): StructuredFieldName[];
/** Discriminated result type for the full resume flow. */
export type ResumeResult = {
    outcome: 'resumed';
    result: ResumeSessionResult;
} | {
    outcome: 'not_found';
} | {
    outcome: 'ambiguous';
    sessions: ClaimSession[];
};
/**
 * Attempts to resume an existing `ClaimSession`.
 *
 * 1. Looks up the session via `lookupClaimSession`.
 * 2. On a successful single-session match, returns the session's
 *    `structuredFields` unchanged (Property 11) and computes which fields
 *    still need attention, excluding confirmed fields (Property 12).
 *
 * The `structuredFields` on the associated `Claim` are retrieved from the
 * claims table using the session's `claimId`. If the claim does not exist
 * or has no fields yet, empty/null-value fields are assumed.
 *
 * _Requirements: 3.1, 3.2, 3.3_
 */
export declare function resumeSession(key: LookupKey, sessionsTable: ClaimSessionsTable, getCapturedFields: (claimId: string) => Promise<StructuredClaimFields>, fieldConfidenceThreshold: number): Promise<ResumeResult>;
//# sourceMappingURL=resumeSession.d.ts.map