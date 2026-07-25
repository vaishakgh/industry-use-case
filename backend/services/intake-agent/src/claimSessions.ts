/**
 * ClaimSessions DynamoDB access layer.
 *
 * Implements get/put/update CRUD against the `ClaimSessions` table (PK
 * `claimId`) plus a `PolicyNumberStatusIndex` GSI query (PK `policyNumber`,
 * SK `claimStatus`) used for cross-channel resume (Req 3.1, 3.2) and
 * ambiguous-match disambiguation (Req 3.5).
 *
 * The `ClaimSessionsTable` interface is the seam consumed by the rest of
 * the intake agent (session-resume logic, `lookupClaimSession` tool, etc.);
 * `DynamoClaimSessionsTable` is the only concrete implementation, backed by
 * `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`, so tests can mock
 * the underlying `DynamoDBDocumentClient` (via `aws-sdk-client-mock`)
 * without live AWS credentials.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ClaimSession, ClaimStatus } from '@claims/shared';

/** Default `ClaimSessions` table name, overridable via `CLAIMS_SESSIONS_TABLE_NAME`. */
export const DEFAULT_CLAIM_SESSIONS_TABLE_NAME = 'ClaimSessions';

/** Name of the GSI (PK `policyNumber`, SK `claimStatus`) described in the design's Data Models section. */
export const POLICY_NUMBER_STATUS_INDEX_NAME = 'PolicyNumberStatusIndex';

/** Fields on `ClaimSession` that may be modified via `updateClaimSession`; `claimId` is the immutable key. */
export type ClaimSessionUpdates = Partial<Omit<ClaimSession, 'claimId'>>;

/**
 * Access-layer interface for the `ClaimSessions` table. Kept separate from
 * the DynamoDB implementation so callers (and tests) can depend on this
 * interface rather than the AWS SDK directly.
 */
export interface ClaimSessionsTable {
  /** Fetches a `ClaimSession` by its `claimId`, or `undefined` if none exists. */
  getClaimSession(claimId: string): Promise<ClaimSession | undefined>;

  /** Writes (creates or fully replaces) a `ClaimSession`. */
  putClaimSession(session: ClaimSession): Promise<void>;

  /**
   * Applies a partial update to an existing `ClaimSession` and returns the
   * updated record. Throws if `updates` is empty.
   */
  updateClaimSession(claimId: string, updates: ClaimSessionUpdates): Promise<ClaimSession>;

  /**
   * Queries the `PolicyNumberStatusIndex` GSI for all `ClaimSession`s
   * matching the given `policyNumber` and `claimStatus`. Returns zero, one,
   * or many matches -- callers use the match count to decide whether to
   * resume directly (exactly one) or disambiguate (more than one).
   */
  queryByPolicyNumberAndStatus(policyNumber: string, claimStatus: ClaimStatus): Promise<ClaimSession[]>;
}

export interface DynamoClaimSessionsTableOptions {
  /** Underlying `DynamoDBDocumentClient` to use. Defaults to a client built from `DynamoDBClient`. */
  documentClient?: DynamoDBDocumentClient;
  /** `ClaimSessions` table name. Defaults to `CLAIMS_SESSIONS_TABLE_NAME` env var, then `DEFAULT_CLAIM_SESSIONS_TABLE_NAME`. */
  tableName?: string;
  /** GSI name for the policy-number/status lookup. Defaults to `PolicyNumberStatusIndex`. */
  indexName?: string;
}

/** DynamoDB-backed implementation of `ClaimSessionsTable`. */
export class DynamoClaimSessionsTable implements ClaimSessionsTable {
  private readonly documentClient: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly indexName: string;

  constructor(options: DynamoClaimSessionsTableOptions = {}) {
    this.documentClient = options.documentClient ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.tableName =
      options.tableName ?? process.env.CLAIMS_SESSIONS_TABLE_NAME ?? DEFAULT_CLAIM_SESSIONS_TABLE_NAME;
    this.indexName = options.indexName ?? POLICY_NUMBER_STATUS_INDEX_NAME;
  }

  async getClaimSession(claimId: string): Promise<ClaimSession | undefined> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { claimId },
      }),
    );
    return result.Item as ClaimSession | undefined;
  }

  async putClaimSession(session: ClaimSession): Promise<void> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: session,
      }),
    );
  }

  async updateClaimSession(claimId: string, updates: ClaimSessionUpdates): Promise<ClaimSession> {
    const fields = Object.keys(updates) as (keyof ClaimSessionUpdates)[];
    if (fields.length === 0) {
      throw new Error('updateClaimSession requires at least one field to update');
    }

    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};
    const setClauses: string[] = [];

    fields.forEach((field, index) => {
      const nameToken = `#f${index}`;
      const valueToken = `:v${index}`;
      expressionAttributeNames[nameToken] = field as string;
      expressionAttributeValues[valueToken] = updates[field];
      setClauses.push(`${nameToken} = ${valueToken}`);
    });

    const result = await this.documentClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { claimId },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }),
    );

    return result.Attributes as ClaimSession;
  }

  async queryByPolicyNumberAndStatus(
    policyNumber: string,
    claimStatus: ClaimStatus,
  ): Promise<ClaimSession[]> {
    const result = await this.documentClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: this.indexName,
        KeyConditionExpression: 'policyNumber = :policyNumber AND claimStatus = :claimStatus',
        ExpressionAttributeValues: {
          ':policyNumber': policyNumber,
          ':claimStatus': claimStatus,
        },
      }),
    );

    return (result.Items ?? []) as ClaimSession[];
  }
}

/** Convenience factory mirroring the constructor, for call sites that prefer a function over `new`. */
export function createClaimSessionsTable(
  options: DynamoClaimSessionsTableOptions = {},
): ClaimSessionsTable {
  return new DynamoClaimSessionsTable(options);
}
