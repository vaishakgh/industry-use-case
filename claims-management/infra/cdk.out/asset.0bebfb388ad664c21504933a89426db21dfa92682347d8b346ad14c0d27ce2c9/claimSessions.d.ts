import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { ClaimSession, ClaimStatus } from '@claims/shared';
/** Default `ClaimSessions` table name, overridable via `CLAIMS_SESSIONS_TABLE_NAME`. */
export declare const DEFAULT_CLAIM_SESSIONS_TABLE_NAME = "ClaimSessions";
/** Name of the GSI (PK `policyNumber`, SK `claimStatus`) described in the design's Data Models section. */
export declare const POLICY_NUMBER_STATUS_INDEX_NAME = "PolicyNumberStatusIndex";
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
export declare class DynamoClaimSessionsTable implements ClaimSessionsTable {
    private readonly documentClient;
    private readonly tableName;
    private readonly indexName;
    constructor(options?: DynamoClaimSessionsTableOptions);
    getClaimSession(claimId: string): Promise<ClaimSession | undefined>;
    putClaimSession(session: ClaimSession): Promise<void>;
    updateClaimSession(claimId: string, updates: ClaimSessionUpdates): Promise<ClaimSession>;
    queryByPolicyNumberAndStatus(policyNumber: string, claimStatus: ClaimStatus): Promise<ClaimSession[]>;
}
/** Convenience factory mirroring the constructor, for call sites that prefer a function over `new`. */
export declare function createClaimSessionsTable(options?: DynamoClaimSessionsTableOptions): ClaimSessionsTable;
//# sourceMappingURL=claimSessions.d.ts.map