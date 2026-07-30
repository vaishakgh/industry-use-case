"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoClaimSessionsTable = exports.POLICY_NUMBER_STATUS_INDEX_NAME = exports.DEFAULT_CLAIM_SESSIONS_TABLE_NAME = void 0;
exports.createClaimSessionsTable = createClaimSessionsTable;
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
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
/** Default `ClaimSessions` table name, overridable via `CLAIMS_SESSIONS_TABLE_NAME`. */
exports.DEFAULT_CLAIM_SESSIONS_TABLE_NAME = 'ClaimSessions';
/** Name of the GSI (PK `policyNumber`, SK `claimStatus`) described in the design's Data Models section. */
exports.POLICY_NUMBER_STATUS_INDEX_NAME = 'PolicyNumberStatusIndex';
/** DynamoDB-backed implementation of `ClaimSessionsTable`. */
class DynamoClaimSessionsTable {
    documentClient;
    tableName;
    indexName;
    constructor(options = {}) {
        this.documentClient = options.documentClient ?? lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
        this.tableName =
            options.tableName ?? process.env.CLAIMS_SESSIONS_TABLE_NAME ?? exports.DEFAULT_CLAIM_SESSIONS_TABLE_NAME;
        this.indexName = options.indexName ?? exports.POLICY_NUMBER_STATUS_INDEX_NAME;
    }
    async getClaimSession(claimId) {
        const result = await this.documentClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { claimId },
        }));
        return result.Item;
    }
    async putClaimSession(session) {
        await this.documentClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: session,
        }));
    }
    async updateClaimSession(claimId, updates) {
        const fields = Object.keys(updates);
        if (fields.length === 0) {
            throw new Error('updateClaimSession requires at least one field to update');
        }
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        const setClauses = [];
        fields.forEach((field, index) => {
            const nameToken = `#f${index}`;
            const valueToken = `:v${index}`;
            expressionAttributeNames[nameToken] = field;
            expressionAttributeValues[valueToken] = updates[field];
            setClauses.push(`${nameToken} = ${valueToken}`);
        });
        const result = await this.documentClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: { claimId },
            UpdateExpression: `SET ${setClauses.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    async queryByPolicyNumberAndStatus(policyNumber, claimStatus) {
        const result = await this.documentClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: this.indexName,
            KeyConditionExpression: 'policyNumber = :policyNumber AND claimStatus = :claimStatus',
            ExpressionAttributeValues: {
                ':policyNumber': policyNumber,
                ':claimStatus': claimStatus,
            },
        }));
        return (result.Items ?? []);
    }
}
exports.DynamoClaimSessionsTable = DynamoClaimSessionsTable;
/** Convenience factory mirroring the constructor, for call sites that prefer a function over `new`. */
function createClaimSessionsTable(options = {}) {
    return new DynamoClaimSessionsTable(options);
}
//# sourceMappingURL=claimSessions.js.map