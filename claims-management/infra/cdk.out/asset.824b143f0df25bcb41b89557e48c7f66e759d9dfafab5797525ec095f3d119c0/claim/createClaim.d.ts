/**
 * Unique Claim_ID allocation on claim creation.
 *
 * `createClaimWithUniqueId` implements the "Unique claim creation on new
 * session" behavior (design.md Property 1): it generates a ULID-based
 * `Claim_ID` (see `claimId.ts`), attempts a conditional `PutItem` against
 * the `Claims` table via the injected `ClaimsRepository`, and -- in the
 * astronomically unlikely event of a `Claim_ID` collision -- retries with
 * a freshly generated ULID, up to a small maximum retry count, before
 * throwing a clear, actionable error.
 *
 * See design.md: Key Architectural Decisions ("Use DynamoDB with a
 * `PutItem` condition expression..."); Property 1: Unique claim creation
 * on new session; FNOL Intake Agent tool `createClaim()`.
 *
 * _Requirements: 1.4_
 */
import type { Claim } from '@claims/shared';
import { type ClaimsRepository } from './claimsRepository';
/** The fields of a `Claim` supplied by the caller; `claimId` is allocated here. */
export type ClaimData = Omit<Claim, 'claimId'>;
/** Default maximum number of `Claim_ID` collision retries before giving up. */
export declare const DEFAULT_MAX_CLAIM_ID_RETRIES = 5;
/**
 * Raised when `createClaimWithUniqueId` exhausts its retry budget without
 * successfully allocating a unique `Claim_ID`. This should only occur if
 * the underlying `ClaimsRepository` or its ULID source is misbehaving,
 * since ULID collisions are effectively impossible in normal operation.
 */
export declare class ClaimIdAllocationExhaustedError extends Error {
    readonly attempts: number;
    constructor(attempts: number);
}
/**
 * Creates a new `Claim` with a unique, ULID-based `Claim_ID`.
 *
 * Generates a `Claim_ID`, attempts to persist the claim via a conditional
 * `PutItem` (`attribute_not_exists(claimId)`), and retries with a freshly
 * generated `Claim_ID` if a collision is detected, up to `maxRetries`
 * attempts total. Any non-collision failure from the repository (e.g., a
 * throttling or network error) propagates immediately without being
 * retried here.
 *
 * @param claimData The `Claim` fields other than `claimId`.
 * @param repository The `Claims` table access layer to write through.
 * @param maxRetries The maximum number of attempts to make (default 5).
 *   Must be at least 1.
 * @returns The created `Claim`, including its allocated `claimId`.
 * @throws {ClaimIdAllocationExhaustedError} if every attempt collides.
 * @throws {ClaimsAccessError} if the repository reports a non-collision
 *   failure.
 */
export declare function createClaimWithUniqueId(claimData: ClaimData, repository: ClaimsRepository, maxRetries?: number): Promise<Claim>;
//# sourceMappingURL=createClaim.d.ts.map