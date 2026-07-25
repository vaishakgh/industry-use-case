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
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { AuditLogRecord } from '@claims/shared';

/** Name of the `AuditLog` DynamoDB table, overridable via environment variable. */
export const AUDIT_LOG_TABLE_NAME = process.env.AUDIT_LOG_TABLE_NAME ?? 'AuditLog';

/** Name of the `ClaimIdIndex` GSI (PK `claimId`, SK `logId`), per design.md. */
export const CLAIM_ID_INDEX_NAME = 'ClaimIdIndex';

/**
 * Raised when `putAuditLogRecord` fails because a record with the same
 * `logId`/`claimId` primary key already exists (the DynamoDB conditional
 * check `attribute_not_exists(logId)` failed). Distinguished from
 * `AuditLogAccessError` so callers can classify a duplicate-key collision
 * separately from a genuine write/read failure (see design.md Error
 * Handling: "Audit Log Service").
 */
export class AuditLogDuplicateRecordError extends Error {
  constructor(public readonly logId: string) {
    super(`Audit log record with logId "${logId}" already exists`);
    this.name = 'AuditLogDuplicateRecordError';
    Object.setPrototypeOf(this, AuditLogDuplicateRecordError.prototype);
  }
}

/**
 * Raised when a `putAuditLogRecord` or `queryAuditLogByClaimId` call fails
 * for any reason other than a duplicate-key conditional check failure
 * (e.g., throttling, network error, table not found). Always treated as a
 * genuine failure -- for writes, this is what should trigger
 * `Claims.AuditFailure` in the audit-write-precedes-effect wrapper (task
 * 2.4/2.9).
 */
export class AuditLogAccessError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AuditLogAccessError';
    Object.setPrototypeOf(this, AuditLogAccessError.prototype);
  }
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
export class DynamoDbAuditLogRepository implements AuditLogRepository {
  private readonly tableName: string;
  private readonly claimIdIndexName: string;

  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    options: DynamoDbAuditLogRepositoryOptions = {},
  ) {
    this.tableName = options.tableName ?? AUDIT_LOG_TABLE_NAME;
    this.claimIdIndexName = options.claimIdIndexName ?? CLAIM_ID_INDEX_NAME;
  }

  async putAuditLogRecord(record: AuditLogRecord): Promise<void> {
    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: record,
          ConditionExpression: 'attribute_not_exists(logId)',
        }),
      );
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        throw new AuditLogDuplicateRecordError(record.logId);
      }
      throw new AuditLogAccessError(
        `Failed to write audit log record "${record.logId}": ${errorMessage(error)}`,
        error,
      );
    }
  }

  async queryAuditLogByClaimId(claimId: string): Promise<AuditLogRecord[]> {
    const records: AuditLogRecord[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    try {
      do {
        const result = await this.docClient.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: this.claimIdIndexName,
            KeyConditionExpression: 'claimId = :claimId',
            ExpressionAttributeValues: { ':claimId': claimId },
            ScanIndexForward: true, // ascending logId (ULID) order => chronological, oldest first
            ExclusiveStartKey: exclusiveStartKey,
          }),
        );
        records.push(...((result.Items ?? []) as AuditLogRecord[]));
        exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (exclusiveStartKey !== undefined);
    } catch (error) {
      throw new AuditLogAccessError(
        `Failed to query audit log records for claimId "${claimId}": ${errorMessage(error)}`,
        error,
      );
    }

    return records;
  }
}

function isConditionalCheckFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as { name?: string }).name === 'ConditionalCheckFailedException';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Convenience factory that constructs a `DynamoDbAuditLogRepository` from a
 * low-level `DynamoDBClient`, wrapping it in a `DynamoDBDocumentClient`.
 * Production Lambda handlers use this; tests instead construct
 * `DynamoDbAuditLogRepository` directly with a mocked `DynamoDBDocumentClient`.
 */
export function createAuditLogRepository(
  client: DynamoDBClient = new DynamoDBClient({}),
  options?: DynamoDbAuditLogRepositoryOptions,
): DynamoDbAuditLogRepository {
  return new DynamoDbAuditLogRepository(DynamoDBDocumentClient.from(client), options);
}
