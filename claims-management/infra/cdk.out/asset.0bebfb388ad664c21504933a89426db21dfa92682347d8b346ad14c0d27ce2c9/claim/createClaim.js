"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimIdAllocationExhaustedError = exports.DEFAULT_MAX_CLAIM_ID_RETRIES = void 0;
exports.createClaimWithUniqueId = createClaimWithUniqueId;
const claimId_1 = require("./claimId");
const claimsRepository_1 = require("./claimsRepository");
/** Default maximum number of `Claim_ID` collision retries before giving up. */
exports.DEFAULT_MAX_CLAIM_ID_RETRIES = 5;
/**
 * Raised when `createClaimWithUniqueId` exhausts its retry budget without
 * successfully allocating a unique `Claim_ID`. This should only occur if
 * the underlying `ClaimsRepository` or its ULID source is misbehaving,
 * since ULID collisions are effectively impossible in normal operation.
 */
class ClaimIdAllocationExhaustedError extends Error {
    attempts;
    constructor(attempts) {
        super(`Failed to allocate a unique Claim_ID after ${attempts} attempt(s); ` +
            'all generated Claim_IDs collided with an existing Claim. This ' +
            'indicates a problem with the Claims table or Claim_ID generation, ' +
            'not routine bad luck.');
        this.attempts = attempts;
        this.name = 'ClaimIdAllocationExhaustedError';
        Object.setPrototypeOf(this, ClaimIdAllocationExhaustedError.prototype);
    }
}
exports.ClaimIdAllocationExhaustedError = ClaimIdAllocationExhaustedError;
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
async function createClaimWithUniqueId(claimData, repository, maxRetries = exports.DEFAULT_MAX_CLAIM_ID_RETRIES) {
    if (maxRetries < 1) {
        throw new RangeError(`maxRetries must be at least 1, got ${maxRetries}`);
    }
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        const claim = { ...claimData, claimId: (0, claimId_1.generateClaimId)() };
        try {
            await repository.putClaimIfNotExists(claim);
            return claim;
        }
        catch (error) {
            if (error instanceof claimsRepository_1.ClaimIdCollisionError) {
                continue;
            }
            throw error;
        }
    }
    throw new ClaimIdAllocationExhaustedError(maxRetries);
}
//# sourceMappingURL=createClaim.js.map