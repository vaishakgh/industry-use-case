/**
 * DynamoDB access layer for the append-only `AuditLog` table.
 *
 * Implements:
 *  - `putAuditLogRecord`: an append-only `PutItem` guarded by
 *    `ConditionExpression: attribute_not_exists(logId)`, enforcing the
 *    immutability guarantee from Requirement 8.2. Duplicate-key conditional
 *    failures are surfaced as a distinct error type from genuine write
 *    failures, since task 2.9 (and the audit-write-precedes-effect wrapper,
 *    task 2.4) need to classify them differently.
 *  - `queryAuditLogByClaimId`: a query against the `ClaimIdIndex` GSI (PK
 *    `claimId`, SK `logId`) returning records in chronological order
 *    (oldest first), per Requirement 8.4. Since `logId` is a ULID
 *    (lexicographically sortable by creation time), an ascending
 *    (`ScanIndexForward: true`) query on the GSI sort key naturally yields
 *    chronological order.
 *
 * The DynamoDB DocumentClient is injected behind the `AuditLogRepository`
 * interface so tests can supply a mocked client (e.g. via
 * `aws-sdk-client-mock`) without live AWS credentials.
 *
 * See design.md: "Audit Log Service" and Data Models: AuditLogRecord
 * (DynamoDB table `AuditLog`, PK `logId`, SK `claimId`).
 *
 * _Requirements: 8.2, 8.4_
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { AuditLogRecord } from '@claims/shared';
/** Name of the `AuditLog` DynamoDB table, overridable via environment variable. */
export declare const AUDIT_LOG_TABLE_NAME: string;
/** Name of the `ClaimIdIndex` GSI (PK `claimId`, SK `logId`), per design.md. */
export declare const CLAIM_ID_INDEX_NAME = "ClaimIdIndex";
/**
 * Raised when `putAuditLogRecord` fails because a record with the same
 * `logId`/`claimId` primary key already exists (the DynamoDB conditional
 * check `attribute_not_exists(logId)` failed). Distinguished from
 * `AuditLogAccessError` so callers can classify a duplicate-key collision
 * separately from a genuine write/read failure (see design.md Error
 * Handling: "Audit Log Service").
 */
export declare class AuditLogDuplicateRecordError extends Error {
    readonly logId: string;
    constructor(logId: string);
}
/**
 * Raised when a `putAuditLogRecord` or `queryAuditLogByClaimId` call fails
 * for any reason other than a duplicate-key conditional check failure
 * (e.g., throttling, network error, table not found). Always treated as a
 * genuine failure -- for writes, this is what should trigger
 * `Claims.AuditFailure` in the audit-write-precedes-effect wrapper (task
 * 2.4/2.9).
 */
export declare class AuditLogAccessError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/**
 * Access layer for the append-only `AuditLog` DynamoDB table, abstracted
 * behind an interface so it can be mocked in tests without live AWS
 * credentials.
 */
export interface AuditLogRepository {
    /**
     * Appends a new `AuditLogRecord` using a conditional `PutItem`
     * (`attribute_not_exists(logId)`), enforcing the append-only /
     * immutability guarantee from Requirement 8.2.
     *
     * @throws {AuditLogDuplicateRecordError} if a record with the same
     *   `logId` already exists.
     * @throws {AuditLogAccessError} for any other DynamoDB failure.
     */
    putAuditLogRecord(record: AuditLogRecord): Promise<void>;
    /**
     * Queries the `ClaimIdIndex` GSI for every `AuditLogRecord` associated
     * with the given `claimId`, ordered chronologically (oldest first) per
     * Requirement 8.4. Returns an empty array if no records exist for the
     * given `claimId`.
     *
     * @throws {AuditLogAccessError} if the query fails.
     */
    queryAuditLogByClaimId(claimId: string): Promise<AuditLogRecord[]>;
}
export interface DynamoDbAuditLogRepositoryOptions {
    tableName?: string;
    claimIdIndexName?: string;
}
/**
 * DynamoDB-backed implementation of `AuditLogRepository`, built on
 * `@aws-sdk/lib-dynamodb`'s `DynamoDBDocumentClient`. The document client is
 * injected so tests can supply an `aws-sdk-client-mock`-mocked client
 * instead of a live AWS connection.
 */
export declare class DynamoDbAuditLogRepository implements AuditLogRepository {
    private readonly docClient;
    private readonly tableName;
    private readonly claimIdIndexName;
    constructor(docClient: DynamoDBDocumentClient, options?: DynamoDbAuditLogRepositoryOptions);
    putAuditLogRecord(record: AuditLogRecord): Promise<void>;
    queryAuditLogByClaimId(claimId: string): Promise<AuditLogRecord[]>;
}
/**
 * Convenience factory that constructs a `DynamoDbAuditLogRepository` from a
 * low-level `DynamoDBClient`, wrapping it in a `DynamoDBDocumentClient`.
 * Production Lambda handlers use this; tests instead construct
 * `DynamoDbAuditLogRepository` directly with a mocked `DynamoDBDocumentClient`.
 */
export declare function createAuditLogRepository(client?: DynamoDBClient, options?: DynamoDbAuditLogRepositoryOptions): DynamoDbAuditLogRepository;
//# sourceMappingURL=auditLogRepository.d.ts.map