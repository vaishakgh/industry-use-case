/**
 * Claim_ID generation.
 *
 * `Claim_ID`s are ULIDs (Universally Unique Lexicographically Sortable
 * Identifiers): 26-character, Crockford-base32-encoded strings composed of
 * a 48-bit millisecond timestamp followed by 80 bits of randomness. This
 * gives every generated id both effectively-unique randomness and a
 * lexicographic sort order that matches creation time -- the same rationale
 * design.md gives for using ULIDs as `AuditLogRecord.logId` values.
 *
 * See Glossary: Claim; Data Models: Claim (DynamoDB table `Claims`, PK
 * `claimId`).
 *
 * _Requirements: 1.4_
 */
import { ulid } from 'ulid';

/**
 * Generates a new ULID-based `Claim_ID`.
 *
 * Each call produces a fresh, effectively-unique 26-character string. Ids
 * generated at increasing points in time sort lexicographically in
 * generation order, since the timestamp component is encoded first.
 */
export function generateClaimId(): string {
  return ulid();
}
