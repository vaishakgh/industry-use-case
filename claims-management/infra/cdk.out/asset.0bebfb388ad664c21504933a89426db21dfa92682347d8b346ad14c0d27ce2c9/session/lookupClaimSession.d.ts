/**
 * lookupClaimSession tool.
 *
 * Queries the ClaimSessions table by Claim_ID or by policy number (via the
 * `PolicyNumberStatusIndex` GSI) and returns zero, one, or multiple
 * matching sessions with `Claim_Status = Intake`.
 *
 * Callers use the result to decide whether to:
 * - Resume directly (exactly one match)
 * - Disambiguate (more than one match by policy number)
 * - Inform the customer that no session exists (zero matches)
 *
 * See design.md: FNOL Intake Agent, "Implement lookupClaimSession tool"
 * _Requirements: 3.1, 3.4, 3.5_
 */
import type { ClaimSession } from '@claims/shared';
import type { ClaimSessionsTable } from '../claimSessions';
/** The kind of identifier used to look up a session. */
export type LookupKey = {
    type: 'claimId';
    claimId: string;
} | {
    type: 'policyNumber';
    policyNumber: string;
};
/** Discriminated union representing the outcome of a session lookup. */
export type LookupResult = {
    outcome: 'found';
    session: ClaimSession;
} | {
    outcome: 'not_found';
} | {
    outcome: 'ambiguous';
    sessions: ClaimSession[];
};
/**
 * Looks up a `ClaimSession` by the given key.
 *
 * - By `claimId`: fetches the session directly. Returns `found` if the
 *   session exists and has `Claim_Status = Intake`, otherwise `not_found`.
 * - By `policyNumber`: queries the GSI for all sessions matching the
 *   policy number with status `Intake`. Returns `found` if exactly one
 *   match, `ambiguous` if more than one, and `not_found` if zero.
 *
 * _Requirements: 3.1, 3.4, 3.5_
 */
export declare function lookupClaimSession(key: LookupKey, sessionsTable: ClaimSessionsTable): Promise<LookupResult>;
//# sourceMappingURL=lookupClaimSession.d.ts.map