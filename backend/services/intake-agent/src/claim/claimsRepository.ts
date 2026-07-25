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
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Claim } from '@claims/shared';

/** Name of the `Claims` DynamoDB table, overridable via environment variable. */
export const CLAIMS_TABLE_NAME = process.env.CLAIMS_TABLE_NAME ?? 'Claims';

/**
 * Raised when `putClaimIfNotExists` fails because a `Claim` with the same
 * `claimId` already exists (the DynamoDB conditional check
 * `attribute_not_exists(claimId)` failed) -- a `Claim_ID` collision.
 * Distinguished from `ClaimsAccessError` so callers can retry with a fresh
 * `Claim_ID` rather than treating the failure as a genuine write error.
 */
export class ClaimIdCollisionError extends Error {
  constructor(public readonly claimId: string) {
    super(`Claim with claimId "${claimId}" already exists`);
    this.name = 'ClaimIdCollisionError';
    Object.setPrototypeOf(this, ClaimIdCollisionError.prototype);
  }
}

/**
 * Raised when a `putClaimIfNotExists` call fails for any reason other than
 * a `Claim_ID` collision (e.g., throttling, network error, table not
 * found). Always treated as a genuine failure.
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
export class DynamoDbClaimsRepository implements ClaimsRepository {
  private readonly tableName: string;

  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    options: DynamoDbClaimsRepositoryOptions = {},
  ) {
    this.tableName = options.tableName ?? CLAIMS_TABLE_NAME;
  }

  async putClaimIfNotExists(claim: Claim): Promise<void> {
    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: claim,
          ConditionExpression: 'attribute_not_exists(claimId)',
        }),
      );
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        throw new ClaimIdCollisionError(claim.claimId);
      }
      throw new ClaimsAccessError(`Failed to put claim "${claim.claimId}": ${errorMessage(error)}`, error);
    }
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
