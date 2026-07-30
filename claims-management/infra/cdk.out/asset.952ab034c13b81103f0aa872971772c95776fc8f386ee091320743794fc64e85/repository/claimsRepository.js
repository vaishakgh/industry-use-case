"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDbClaimsRepository = exports.ClaimsAccessError = exports.CLAIMS_TABLE_NAME = void 0;
exports.createClaimsRepository = createClaimsRepository;
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
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
/** Name of the `Claims` DynamoDB table, overridable via environment variable. */
exports.CLAIMS_TABLE_NAME = process.env.CLAIMS_TABLE_NAME ?? 'Claims';
/**
 * Raised when a `ClaimsRepository` operation fails against DynamoDB (e.g.,
 * throttling, network error, table not found, or a failed condition
 * check). Callers that need to distinguish a specific failure mode (such
 * as a conditional-write collision) should inspect `cause`.
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
    async getClaim(claimId) {
        try {
            const result = await this.docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { claimId },
            }));
            return result.Item ?? null;
        }
        catch (error) {
            throw new ClaimsAccessError(`Failed to get claim "${claimId}": ${errorMessage(error)}`, error);
        }
    }
    async putClaim(claim) {
        try {
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: claim,
            }));
        }
        catch (error) {
            throw new ClaimsAccessError(`Failed to put claim "${claim.claimId}": ${errorMessage(error)}`, error);
        }
    }
    async updateClaim(claimId, updates) {
        const entries = Object.entries(updates);
        if (entries.length === 0) {
            return;
        }
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        const setClauses = [];
        entries.forEach(([field, value], index) => {
            const nameToken = `#f${index}`;
            const valueToken = `:v${index}`;
            expressionAttributeNames[nameToken] = field;
            expressionAttributeValues[valueToken] = value;
            setClauses.push(`${nameToken} = ${valueToken}`);
        });
        try {
            await this.docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { claimId },
                UpdateExpression: `SET ${setClauses.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
            }));
        }
        catch (error) {
            throw new ClaimsAccessError(`Failed to update claim "${claimId}": ${errorMessage(error)}`, error);
        }
    }
    async appendStatusHistory(claimId, status, timestamp) {
        const entry = { status, timestamp };
        try {
            await this.docClient.send(new lib_dynamodb_1.UpdateCommand({
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
            }));
        }
        catch (error) {
            throw new ClaimsAccessError(`Failed to append status history entry for claim "${claimId}": ${errorMessage(error)}`, error);
        }
    }
}
exports.DynamoDbClaimsRepository = DynamoDbClaimsRepository;
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