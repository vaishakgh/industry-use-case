"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupClaimSession = lookupClaimSession;
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
async function lookupClaimSession(key, sessionsTable) {
    if (key.type === 'claimId') {
        const session = await sessionsTable.getClaimSession(key.claimId);
        if (!session || session.claimStatus !== 'Intake') {
            return { outcome: 'not_found' };
        }
        return { outcome: 'found', session };
    }
    // Lookup by policy number — query the GSI
    const matches = await sessionsTable.queryByPolicyNumberAndStatus(key.policyNumber, 'Intake');
    if (matches.length === 0) {
        return { outcome: 'not_found' };
    }
    if (matches.length === 1) {
        return { outcome: 'found', session: matches[0] };
    }
    return { outcome: 'ambiguous', sessions: matches };
}
//# sourceMappingURL=lookupClaimSession.js.map