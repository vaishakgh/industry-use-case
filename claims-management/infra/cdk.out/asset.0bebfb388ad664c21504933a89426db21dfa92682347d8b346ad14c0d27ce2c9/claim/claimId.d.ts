/**
 * Generates a new ULID-based `Claim_ID`.
 *
 * Each call produces a fresh, effectively-unique 26-character string. Ids
 * generated at increasing points in time sort lexicographically in
 * generation order, since the timestamp component is encoded first.
 */
export declare function generateClaimId(): string;
//# sourceMappingURL=claimId.d.ts.map