"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDbClaimsRepository = exports.ClaimsAccessError = exports.ClaimIdCollisionError = exports.CLAIMS_TABLE_NAME = void 0;
exports.createClaimsRepository = createClaimsRepository;
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
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
/** Name of the `Claims` DynamoDB table, overridable via environment variable. */
exports.CLAIMS_TABLE_NAME = process.env.CLAIMS_TABLE_NAME ?? 'Claims';
/**
 * Raised when `putClaimIfNotExists` fails because a `Claim` with the same
 * `claimId` already exists (the DynamoDB conditional check
 * `attribute_not_exists(claimId)` failed) -- a `Claim_ID` collision.
 * Distinguished from `ClaimsAccessError` so callers can retry with a fresh
 * `Claim_ID` rather than treating the failure as a genuine write error.
 */
class ClaimIdCollisionError extends Error {
    claimId;
    constructor(claimId) {
        super(`Claim with claimId "${claimId}" already exists`);
        this.claimId = claimId;
        this.name = 'ClaimIdCollisionError';
        Object.setPrototypeOf(this, ClaimIdCollisionError.prototype);
    }
}
exports.ClaimIdCollisionError = ClaimIdCollisionError;
/**
 * Raised when a `putClaimIfNotExists` call fails for any reason other than
 * a `Claim_ID` collision (e.g., throttling, network error, table not
 * found). Always treated as a genuine failure.
 */
class ClaimsAccessError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'ClaimsAccessError';
        Object.setPrototypeOf(this, ClaimsAccessError.prototype);
    }
}
exports.ClaimsAccessError = ClaimsAccessError;
/**
 * DynamoDB-backed implementation of `ClaimsRepository`, built on
 * `@aws-sdk/lib-dynamodb`'s `DynamoDBDocumentClient`. The document client is
 * injected so tests can supply an `aws-sdk-client-mock`-mocked client
 * instead of a live AWS connection.
 */
class DynamoDbClaimsRepository {
    docClient;
    tableName;
    constructor(docClient, options = {}) {
        this.docClient = docClient;
        this.tableName = options.tableName ?? exports.CLAIMS_TABLE_NAME;
    }
    async putClaimIfNotExists(claim) {
        try {
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: claim,
                ConditionExpression: 'attribute_not_exists(claimId)',
            }));
        }
        catch (error) {
            if (isConditionalCheckFailure(error)) {
                throw new ClaimIdCollisionError(claim.claimId);
            }
            throw new ClaimsAccessError(`Failed to put claim "${claim.claimId}": ${errorMessage(error)}`, error);
        }
    }
}
exports.DynamoDbClaimsRepository = DynamoDbClaimsRepository;
function isConditionalCheckFailure(error) {
    if (!error || typeof error !== 'object') {
        return false;
    }
    return error.name === 'ConditionalCheckFailedException';
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
/**
 * Convenience factory that constructs a `DynamoDbClaimsRepository` from a
 * low-level `DynamoDBClient`, wrapping it in a `DynamoDBDocumentClient`.
 * Production Lambda handlers use this; tests instead construct
 * `DynamoDbClaimsRepository` directly with a mocked `DynamoDBDocumentClient`.
 */
function createClaimsRepository(client = new client_dynamodb_1.DynamoDBClient({}), options) {
    return new DynamoDbClaimsRepository(lib_dynamodb_1.DynamoDBDocumentClient.from(client), options);
}
//# sourceMappingURL=claimsRepository.js.map