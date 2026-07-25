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
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Claim, ClaimStatus, ISODateTimeString, StatusHistoryEntry } from '@claims/shared';

/** Name of the `Claims` DynamoDB table, overridable via environment variable. */
export const CLAIMS_TABLE_NAME = process.env.CLAIMS_TABLE_NAME ?? 'Claims';

/**
 * Raised when a `ClaimsRepository` operation fails against DynamoDB (e.g.,
 * throttling, network error, table not found, or a failed condition
 * check). Callers that need to distinguish a specific failure mode (such
 * as a conditional-write collision) should inspect `cause`.
 */
export class ClaimsAccessError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ClaimsAccessError';
    Object.setPrototypeOf(this, ClaimsAccessError.prototype);
  }
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
export class DynamoDbClaimsRepository implements ClaimsRepository {
  private readonly tableName: string;

  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    options: DynamoDbClaimsRepositoryOptions = {},
  ) {
    this.tableName = options.tableName ?? CLAIMS_TABLE_NAME;
  }

  async getClaim(claimId: string): Promise<Claim | null> {
    try {
      const result = await this.docClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { claimId },
        }),
      );
      return (result.Item as Claim | undefined) ?? null;
    } catch (error) {
      throw new ClaimsAccessError(`Failed to get claim "${claimId}": ${errorMessage(error)}`, error);
    }
  }

  async putClaim(claim: Claim): Promise<void> {
    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: claim,
        }),
      );
    } catch (error) {
      throw new ClaimsAccessError(`Failed to put claim "${claim.claimId}": ${errorMessage(error)}`, error);
    }
  }

  async updateClaim(claimId: string, updates: ClaimUpdate): Promise<void> {
    const entries = Object.entries(updates) as [keyof ClaimUpdate, unknown][];
    if (entries.length === 0) {
      return;
    }

    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};
    const setClauses: string[] = [];

    entries.forEach(([field, value], index) => {
      const nameToken = `#f${index}`;
      const valueToken = `:v${index}`;
      expressionAttributeNames[nameToken] = field;
      expressionAttributeValues[valueToken] = value;
      setClauses.push(`${nameToken} = ${valueToken}`);
    });

    try {
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { claimId },
          UpdateExpression: `SET ${setClauses.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        }),
      );
    } catch (error) {
      throw new ClaimsAccessError(`Failed to update claim "${claimId}": ${errorMessage(error)}`, error);
    }
  }

  async appendStatusHistory(claimId: string, status: ClaimStatus, timestamp: ISODateTimeString): Promise<void> {
    const entry: StatusHistoryEntry = { status, timestamp };

    try {
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { claimId },
          // `list_append(if_not_exists(#statusHistory, :emptyList), :entry)`
          // guarantees the append is atomic and never overwrites prior
          // entries: if the attribute is absent, it is treated as an
          // empty list before appending, otherwise the existing list is
          // read-then-appended-to server-side in a single request.
          UpdateExpression: 'SET #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :entry)',
          ExpressionAttributeNames: { '#statusHistory': 'statusHistory' },
          ExpressionAttributeValues: {
            ':emptyList': [],
            ':entry': [entry],
          },
        }),
      );
    } catch (error) {
      throw new ClaimsAccessError(
        `Failed to append status history entry for claim "${claimId}": ${errorMessage(error)}`,
        error,
      );
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Convenience factory that constructs a `DynamoDbClaimsRepository` from a
 * low-level `DynamoDBClient`, wrapping it in a `DynamoDBDocumentClient`.
 * Production Lambda handlers use this; tests instead construct
 * `DynamoDbClaimsRepository` directly with a mocked `DynamoDBDocumentClient`.
 */
export function createClaimsRepository(
  client: DynamoDBClient = new DynamoDBClient({}),
  options?: DynamoDbClaimsRepositoryOptions,
): DynamoDbClaimsRepository {
  return new DynamoDbClaimsRepository(DynamoDBDocumentClient.from(client), options);
}
