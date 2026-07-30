/**
 * DynamoDB access layer supporting unique `Claim_ID` allocation.
 *
 * Implements a conditional `PutItem` (`attribute_not_exists(claimId)`)
 * against the `Claims` table, so that a `Claim_ID` collision -- which
 * should be astronomically unlikely for a ULID, but is guarded against
 * regardless, per design.md's Error Handling section precedent for the
 * Audit Log Service's `logId` -- is surfaced as a distinct, retryable
 * error rather than silently overwriting an existing `Claim`.
 *
 * This mirrors the DynamoDB access pattern established by
 * `services/orchestrator`'s `ClaimsRepository` (get/put/update against the
 * `Claims` table) and `services/audit-log`'s `AuditLogRepository`
 * (conditional `PutItem` with a distinct duplicate-key error type): the
 * `DynamoDBDocumentClient` is injected behind a narrow interface so tests
 * can supply a mocked client (e.g. via `aws-sdk-client-mock`) without live
 * AWS credentials.
 *
 * See design.md: Data Models: Claim (DynamoDB table `Claims`, PK
 * `claimId`); Key Architectural Decisions ("Use DynamoDB with a `PutItem`
 * condition expression...").
 *
 * _Requirements: 1.4_
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Claim } from '@claims/shared';
/** Name of the `Claims` DynamoDB table, overridable via environment variable. */
export declare const CLAIMS_TABLE_NAME: string;
/**
 * Raised when `putClaimIfNotExists` fails because a `Claim` with the same
 * `claimId` already exists (the DynamoDB conditional check
 * `attribute_not_exists(claimId)` failed) -- a `Claim_ID` collision.
 * Distinguished from `ClaimsAccessError` so callers can retry with a fresh
 * `Claim_ID` rather than treating the failure as a genuine write error.
 */
export declare class ClaimIdCollisionError extends Error {
    readonly claimId: string;
    constructor(claimId: string);
}
/**
 * Raised when a `putClaimIfNotExists` call fails for any reason other than
 * a `Claim_ID` collision (e.g., throttling, network error, table not
 * found). Always treated as a genuine failure.
 */
export declare class ClaimsAccessError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/**
 * Minimal access layer for the `Claims` DynamoDB table needed to allocate
 * a unique `Claim_ID` on claim creation, abstracted behind an interface so
 * it can be mocked in tests without live AWS credentials.
 */
export interface ClaimsRepository {
    /**
     * Writes a new `Claim` item using a conditional `PutItem`
     * (`attribute_not_exists(claimId)`), so an existing `Claim` with the
     * same `claimId` is never overwritten.
     *
     * @throws {ClaimIdCollisionError} if a `Claim` with the same `claimId`
     *   already exists.
     * @throws {ClaimsAccessError} for any other DynamoDB failure.
     */
    putClaimIfNotExists(claim: Claim): Promise<void>;
}
export interface DynamoDbClaimsRepositoryOptions {
    tableName?: string;
}
/**
 * DynamoDB-backed implementation of `ClaimsRepository`, built on
 * `@aws-sdk/lib-dynamodb`'s `DynamoDBDocumentClient`. The document client is
 * injected so tests can supply an `aws-sdk-client-mock`-mocked client
 * instead of a live AWS connection.
 */
export declare class DynamoDbClaimsRepository implements ClaimsRepository {
    private readonly docClient;
    private readonly tableName;
    constructor(docClient: DynamoDBDocumentClient, options?: DynamoDbClaimsRepositoryOptions);
    putClaimIfNotExists(claim: Claim): Promise<void>;
}
/**
 * Convenience factory that constructs a `DynamoDbClaimsRepository` from a
 * low-level `DynamoDBClient`, wrapping it in a `DynamoDBDocumentClient`.
 * Production Lambda handlers use this; tests instead construct
 * `DynamoDbClaimsRepository` directly with a mocked `DynamoDBDocumentClient`.
 */
export declare function createClaimsRepository(client?: DynamoDBClient, options?: DynamoDbClaimsRepositoryOptions): DynamoDbClaimsRepository;
//# sourceMappingURL=claimsRepository.d.ts.map