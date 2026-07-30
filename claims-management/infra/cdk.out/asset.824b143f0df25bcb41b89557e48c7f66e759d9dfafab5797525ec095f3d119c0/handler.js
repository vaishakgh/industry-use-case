"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
/**
 * Lambda handler entry point for the FNOL Intake Agent.
 *
 * Routes incoming events to the appropriate channel normalizer,
 * session lookup/resume, and field extraction logic.
 */
const channels_1 = require("./channels");
const session_1 = require("./session");
const claimSessions_1 = require("./claimSessions");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const documentClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
const sessionsTable = new claimSessions_1.DynamoClaimSessionsTable({ documentClient });
async function handler(event) {
    // If this is a Cognito trigger event, return the event as-is
    if (event.triggerSource) {
        return event;
    }
    const { channel, action } = event;
    try {
        // Channel normalization
        if (action === 'normalize') {
            switch (channel) {
                case 'Voice':
                    return { statusCode: 200, body: (0, channels_1.normalizeVoiceMessage)(event.segments || [], event.options) };
                case 'Email':
                    return { statusCode: 200, body: (0, channels_1.normalizeEmailMessage)(event.payload) };
                case 'Chat':
                    return { statusCode: 200, body: (0, channels_1.normalizeChatMessage)(event.payload) };
                default:
                    return { statusCode: 400, body: { error: `Unknown channel: ${channel}` } };
            }
        }
        // Session lookup
        if (action === 'lookupSession') {
            const key = event.claimId
                ? { type: 'claimId', claimId: event.claimId }
                : { type: 'policyNumber', policyNumber: event.policyNumber };
            const result = await (0, session_1.lookupClaimSession)(key, sessionsTable);
            return { statusCode: 200, body: result };
        }
        // Session resume
        if (action === 'resumeSession') {
            const key = event.claimId
                ? { type: 'claimId', claimId: event.claimId }
                : { type: 'policyNumber', policyNumber: event.policyNumber };
            const getCapturedFields = async () => event.capturedFields || {
                policyNumber: { value: null, confidenceScore: null, confirmed: false },
                incidentDate: { value: null, confidenceScore: null, confirmed: false },
                incidentLocation: { value: null, confidenceScore: null, confirmed: false },
                damageDescription: { value: null, confidenceScore: null, confirmed: false },
            };
            const result = await (0, session_1.resumeSession)(key, sessionsTable, getCapturedFields, event.threshold || 0.75);
            return { statusCode: 200, body: result };
        }
        // Default: return event info
        return {
            statusCode: 200,
            body: { message: 'Intake agent ready', event },
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            body: { error: error.message },
        };
    }
}
//# sourceMappingURL=handler.js.map