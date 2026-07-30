/**
 * DynamoDB access layer for the `Claims` table.
 *
 * Implements:
 *  - `getClaim`: a `GetItem` lookup by `claimId`, returning `null` when no
 *    item exists for that key.
 *  - `putClaim`: a full-item `PutItem`, used for claim creation and
 *    wholesale replacement.
 *  - `updateClaim`: a partial-attribute `UpdateItem`, applying only the
 *    fields present in the given partial `Claim`.
 *  - `appendStatusHistory`: an atomic `UpdateItem` using `list_append` to
 *    add exactly one `{status, timestamp}` entry to `Claim.statusHistory`,
 *    preserving all prior entries (never overwriting the list). This
 *    enforces Requirement 7.6 / Property 28 (the status transition history
 *    invariant: exactly one entry per transition, in order, none lost,
 *    reordered, or duplicated).
 *
 * The DynamoDB DocumentClient is injected behind the `ClaimsRepository`
 * interface so tests can supply a mocked client (e.g. via
 * `aws-sdk-client-mock`) without live AWS credentials.
 *
 * See design.md: Data Models: Claim (DynamoDB table `Claims`, PK `claimId`).
 *
 * _Requirements: 7.6_
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Claim, ClaimStatus, ISODateTimeString } from '@claims/shared';
/** Name of the `Claims` DynamoDB table, overridable via environment variable. */
export declare const CLAIMS_TABLE_NAME: string;
/**
 * Raised when a `ClaimsRepository` operation fails against DynamoDB (e.g.,
 * throttling, network error, table not found, or a failed condition
 * check). Callers that need to distinguish a specific failure mode (such
 * as a conditional-write collision) should inspect `cause`.
 */
export declare class ClaimsAccessError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/**
 * A partial set of top-level `Claim` attributes to apply via `updateClaim`.
 * `claimId` is excluded since it is the key, not an updatable attribute.
 */
export type ClaimUpdate = Partial<Omit<Claim, 'claimId'>>;
/**
 * Access layer for the `Claims` DynamoDB table, abstracted behind an
 * interface so it can be mocked in tests without live AWS credentials.
 */
export interface ClaimsRepository {
    /**
     * Retrieves the `Claim` with the given `claimId`.
     *
     * @returns The `Claim`, or `null` if no item exists for that `claimId`.
     * @throws {ClaimsAccessError} if the read fails.
     */
    getClaim(claimId: string): Promise<Claim | null>;
    /**
     * Writes the full `Claim` item, creating it if absent or replacing it
     * entirely if present.
     *
     * @throws {ClaimsAccessError} if the write fails.
     */
    putClaim(claim: Claim): Promise<void>;
    /**
     * Applies a partial update to the `Claim` identified by `claimId`,
     * setting only the attributes present in `updates`.
     *
     * @throws {ClaimsAccessError} if the update fails.
     */
    updateClaim(claimId: string, updates: ClaimUpdate): Promise<void>;
    /**
     * Atomically appends exactly one `{status, timestamp}` entry to the
     * claim's `statusHistory` list via `list_append`, preserving all prior
     * entries. If the claim has no existing `statusHistory` attribute, one
     * is initialized with the new entry as its sole element.
     *
     * See Property 28 (Status transition history invariant) and
     * Requirement 7.6.
     *
     * @throws {ClaimsAccessError} if the update fails.
     */
    appendStatusHistory(claimId: string, status: ClaimStatus, timestamp: ISODateTimeString): Promise<void>;
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
    getClaim(claimId: string): Promise<Claim | null>;
    putClaim(claim: Claim): Promise<void>;
    updateClaim(claimId: string, updates: ClaimUpdate): Promise<void>;
    appendStatusHistory(claimId: string, status: ClaimStatus, timestamp: ISODateTimeString): Promise<void>;
}
/**
 * Convenience factory that constructs a `DynamoDbClaimsRepository` from a
 * low-level `DynamoDBClient`, wrapping it in a `DynamoDBDocumentClient`.
 * Production Lambda handlers use this; tests instead construct
 * `DynamoDbClaimsRepository` directly with a mocked `DynamoDBDocumentClient`.
 */
export declare function createClaimsRepository(client?: DynamoDBClient, options?: DynamoDbClaimsRepositoryOptions): DynamoDbClaimsRepository;
//# sourceMappingURL=claimsRepository.d.ts.map