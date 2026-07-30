"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
/**
 * Lambda handler entry point for the Customer Portal API.
 *
 * Routes API Gateway events to the appropriate handler based on path/method.
 */
const authClient_1 = require("./auth/authClient");
const claimStatusEndpoint_1 = require("./claims/claimStatusEndpoint");
const shared_1 = require("@claims/shared");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({});
const authClient = new authClient_1.CognitoAuthClient(cognitoClient);
async function handler(event) {
    // Cognito trigger events
    if (event.triggerSource) {
        return handleCognitoTrigger(event);
    }
    // API Gateway events
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const body = event.body ? JSON.parse(event.body) : {};
    const customerId = event.requestContext?.authorizer?.claims?.sub || 'anonymous';
    try {
        // POST /auth/login
        if (path.endsWith('/auth/login') && method === 'POST') {
            const result = await authClient.authenticate(body.username || '', body.password || '');
            if (result.success) {
                return response(200, { tokens: result.tokens });
            }
            return response(401, { message: result.message });
        }
        // GET /claims
        if (path.match(/\/claims\/?$/) && method === 'GET') {
            return response(200, { claims: [], message: 'Claims list endpoint ready' });
        }
        // GET /claims/{id}
        if (path.match(/\/claims\/[^/]+\/?$/) && method === 'GET') {
            const claimId = extractClaimId(path);
            const statusResponse = (0, claimStatusEndpoint_1.buildClaimStatusResponse)(claimId, 'Intake', [
                { status: 'Intake', timestamp: new Date().toISOString() },
            ]);
            return response(200, statusResponse);
        }
        // POST /claims/{id}/documents
        if (path.includes('/documents') && method === 'POST') {
            const claimId = extractClaimId(path);
            return response(200, {
                message: 'Document uploaded successfully.',
                claimId,
                documentRef: `s3://documents/${claimId}/${Date.now()}`,
            });
        }
        // POST /claims/{id}/disputes
        if (path.includes('/disputes') && method === 'POST') {
            const claimId = extractClaimId(path);
            const reason = body.reason || '';
            if (!reason.trim()) {
                return response(400, { message: 'Dispute reason must not be empty.' });
            }
            if (reason.trim().length > shared_1.DEFAULT_SYSTEM_CONFIG.maxDisputeReasonLength) {
                return response(400, {
                    message: `Dispute reason exceeds maximum length of ${shared_1.DEFAULT_SYSTEM_CONFIG.maxDisputeReasonLength} characters.`,
                });
            }
            return response(200, {
                message: 'Dispute submitted successfully.',
                claimId,
                disputeId: `DISP-${Date.now()}`,
            });
        }
        return response(404, { message: 'Not found' });
    }
    catch (error) {
        return response(500, { error: error.message });
    }
}
function handleCognitoTrigger(event) {
    // PreAuthentication trigger — lockout check
    if (event.triggerSource === 'PreAuthentication_Authentication') {
        // In production, check lockout against DynamoDB
        // For now, allow all authentications
        return event;
    }
    return event;
}
function extractClaimId(path) {
    const parts = path.split('/').filter(Boolean);
    const claimsIdx = parts.indexOf('claims');
    return parts[claimsIdx + 1] || 'unknown';
}
function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify(body),
    };
}
//# sourceMappingURL=handler.js.map