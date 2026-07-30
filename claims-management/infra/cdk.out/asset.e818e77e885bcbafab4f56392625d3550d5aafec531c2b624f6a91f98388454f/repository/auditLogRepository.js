"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDbAuditLogRepository = exports.AuditLogAccessError = exports.AuditLogDuplicateRecordError = exports.CLAIM_ID_INDEX_NAME = exports.AUDIT_LOG_TABLE_NAME = void 0;
exports.createAuditLogRepository = createAuditLogRepository;
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
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
/** Name of the `AuditLog` DynamoDB table, overridable via environment variable. */
exports.AUDIT_LOG_TABLE_NAME = process.env.AUDIT_LOG_TABLE_NAME ?? 'AuditLog';
/** Name of the `ClaimIdIndex` GSI (PK `claimId`, SK `logId`), per design.md. */
exports.CLAIM_ID_INDEX_NAME = 'ClaimIdIndex';
/**
 * Raised when `putAuditLogRecord` fails because a record with the same
 * `logId`/`claimId` primary key already exists (the DynamoDB conditional
 * check `attribute_not_exists(logId)` failed). Distinguished from
 * `AuditLogAccessError` so callers can classify a duplicate-key collision
 * separately from a genuine write/read failure (see design.md Error
 * Handling: "Audit Log Service").
 */
class AuditLogDuplicateRecordError extends Error {
    logId;
    constructor(logId) {
        super(`Audit log record with logId "${logId}" already exists`);
        this.logId = logId;
        this.name = 'AuditLogDuplicateRecordError';
        Object.setPrototypeOf(this, AuditLogDuplicateRecordError.prototype);
    }
}
exports.AuditLogDuplicateRecordError = AuditLogDuplicateRecordError;
/**
 * Raised when a `putAuditLogRecord` or `queryAuditLogByClaimId` call fails
 * for any reason other than a duplicate-key conditional check failure
 * (e.g., throttling, network error, table not found). Always treated as a
 * genuine failure -- for writes, this is what should trigger
 * `Claims.AuditFailure` in the audit-write-precedes-effect wrapper (task
 * 2.4/2.9).
 */
class AuditLogAccessError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'AuditLogAccessError';
        Object.setPrototypeOf(this, AuditLogAccessError.prototype);
    }
}
exports.AuditLogAccessError = AuditLogAccessError;
/**
 * DynamoDB-backed implementation of `AuditLogRepository`, built on
 * `@aws-sdk/lib-dynamodb`'s `DynamoDBDocumentClient`. The document client is
 * injected so tests can supply an `aws-sdk-client-mock`-mocked client
 * instead of a live AWS connection.
 */
class DynamoDbAuditLogRepository {
    docClient;
    tableName;
    claimIdIndexName;
    constructor(docClient, options = {}) {
        this.docClient = docClient;
        this.tableName = options.tableName ?? exports.AUDIT_LOG_TABLE_NAME;
        this.claimIdIndexName = options.claimIdIndexName ?? exports.CLAIM_ID_INDEX_NAME;
    }
    async putAuditLogRecord(record) {
        try {
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: record,
                ConditionExpression: 'attribute_not_exists(logId)',
            }));
        }
        catch (error) {
            if (isConditionalCheckFailure(error)) {
                throw new AuditLogDuplicateRecordError(record.logId);
            }
            throw new AuditLogAccessError(`Failed to write audit log record "${record.logId}": ${errorMessage(error)}`, error);
        }
    }
    async queryAuditLogByClaimId(claimId) {
        const records = [];
        let exclusiveStartKey;
        try {
            do {
                const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
                    TableName: this.tableName,
                    IndexName: this.claimIdIndexName,
                    KeyConditionExpression: 'claimId = :claimId',
                    ExpressionAttributeValues: { ':claimId': claimId },
                    ScanIndexForward: true, // ascending logId (ULID) order => chronological, oldest first
                    ExclusiveStartKey: exclusiveStartKey,
                }));
                records.push(...(result.Items ?? []));
                exclusiveStartKey = result.LastEvaluatedKey;
            } while (exclusiveStartKey !== undefined);
        }
        catch (error) {
            throw new AuditLogAccessError(`Failed to query audit log records for claimId "${claimId}": ${errorMessage(error)}`, error);
        }
        return records;
    }
}
exports.DynamoDbAuditLogRepository = DynamoDbAuditLogRepository;
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
 * Convenience factory that constructs a `DynamoDbAuditLogRepository` from a
 * low-level `DynamoDBClient`, wrapping it in a `DynamoDBDocumentClient`.
 * Production Lambda handlers use this; tests instead construct
 * `DynamoDbAuditLogRepository` directly with a mocked `DynamoDBDocumentClient`.
 */
function createAuditLogRepository(client = new client_dynamodb_1.DynamoDBClient({}), options) {
    return new DynamoDbAuditLogRepository(lib_dynamodb_1.DynamoDBDocumentClient.from(client), options);
}
//# sourceMappingURL=auditLogRepository.js.map