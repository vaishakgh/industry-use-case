"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
/**
 * Lambda handler entry point for the Audit Log Service.
 *
 * Records automated decisions and provides audit history queries.
 */
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const auditLogRepository_1 = require("./repository/auditLogRepository");
const recordAutomatedDecision_1 = require("./recordAutomatedDecision");
const getAuditHistoryHandler_1 = require("./handlers/getAuditHistoryHandler");
const documentClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
const repository = new auditLogRepository_1.DynamoDbAuditLogRepository(documentClient);
async function handler(event) {
    const action = event.action || 'record';
    try {
        if (action === 'record') {
            const record = await (0, recordAutomatedDecision_1.recordAutomatedDecision)(event, repository);
            return { statusCode: 200, body: record };
        }
        if (action === 'query') {
            const result = await (0, getAuditHistoryHandler_1.getAuditHistoryHandler)(event, repository);
            return result;
        }
        return { statusCode: 400, body: { error: `Unknown action: ${action}` } };
    }
    catch (error) {
        return { statusCode: 500, body: { error: error.message } };
    }
}
//# sourceMappingURL=handler.js.map