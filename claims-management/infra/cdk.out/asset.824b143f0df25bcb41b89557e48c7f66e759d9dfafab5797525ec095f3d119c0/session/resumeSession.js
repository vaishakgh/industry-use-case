"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingFields = getPendingFields;
exports.resumeSession = resumeSession;
const shared_1 = require("@claims/shared");
const lookupClaimSession_1 = require("./lookupClaimSession");
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
function getPendingFields(fields, fieldConfidenceThreshold) {
    const pending = [];
    for (const fieldName of shared_1.STRUCTURED_FIELD_NAME_VALUES) {
        const field = fields[fieldName];
        // Confirmed fields are never re-requested (Property 12 / Req 3.3)
        if (field.confirmed) {
            continue;
        }
        // Field still needs work: either no value, or value present but below threshold
        if (field.value === null ||
            field.confidenceScore === null ||
            field.confidenceScore < fieldConfidenceThreshold) {
            pending.push(fieldName);
        }
    }
    return pending;
}
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
async function resumeSession(key, sessionsTable, getCapturedFields, fieldConfidenceThreshold) {
    const lookupResult = await (0, lookupClaimSession_1.lookupClaimSession)(key, sessionsTable);
    if (lookupResult.outcome === 'not_found') {
        return { outcome: 'not_found' };
    }
    if (lookupResult.outcome === 'ambiguous') {
        return { outcome: 'ambiguous', sessions: lookupResult.sessions };
    }
    const { session } = lookupResult;
    const capturedFields = await getCapturedFields(session.claimId);
    const pendingFields = getPendingFields(capturedFields, fieldConfidenceThreshold);
    return {
        outcome: 'resumed',
        result: {
            session,
            capturedFields,
            pendingFields,
        },
    };
}
//# sourceMappingURL=resumeSession.js.map