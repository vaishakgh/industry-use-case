"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPLIANCE_OFFICER_GROUP = void 0;
exports.isComplianceOfficer = isComplianceOfficer;
exports.getAuditHistoryHandler = getAuditHistoryHandler;
const auditLogRepository_1 = require("../repository/auditLogRepository");
/** The Cognito group name that grants audit-history read access. */
exports.COMPLIANCE_OFFICER_GROUP = 'ComplianceOfficer';
function toGroupList(value) {
    if (value === undefined) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    return value.split(',').map((group) => group.trim()).filter((group) => group.length > 0);
}
/**
 * Determines whether the requester carries the compliance-officer group
 * claim, per the `AuditHistoryAuthorizerContext` shape documented above.
 */
function isComplianceOfficer(authorizer) {
    if (!authorizer) {
        return false;
    }
    const groups = toGroupList(authorizer.groups);
    const cognitoGroups = toGroupList(authorizer.claims?.['cognito:groups']);
    return groups.includes(exports.COMPLIANCE_OFFICER_GROUP) || cognitoGroups.includes(exports.COMPLIANCE_OFFICER_GROUP);
}
function jsonResponse(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}
/**
 * `GET /audit/claims/{claimId}` handler.
 *
 * - Returns 403 without querying the repository if the requester lacks the
 *   compliance-officer group claim (Requirement 8.5).
 * - Returns 400 without querying the repository if no `claimId` path
 *   parameter is present (malformed request; never reaches the repository
 *   either).
 * - Otherwise queries `repository.queryAuditLogByClaimId(claimId)` and
 *   returns 200 with the (possibly empty) chronologically-ordered records
 *   (Requirement 8.4).
 * - Returns 500 if the repository query fails, rather than letting the
 *   error propagate unhandled.
 */
async function getAuditHistoryHandler(event, repository) {
    if (!isComplianceOfficer(event.requestContext.authorizer)) {
        return jsonResponse(403, { message: 'Forbidden: compliance-officer authorization is required.' });
    }
    const claimId = event.pathParameters?.claimId;
    if (!claimId) {
        return jsonResponse(400, { message: 'Missing required path parameter: claimId.' });
    }
    try {
        const records = await repository.queryAuditLogByClaimId(claimId);
        return jsonResponse(200, { records });
    }
    catch (error) {
        const message = error instanceof auditLogRepository_1.AuditLogAccessError ? error.message : 'Failed to retrieve audit history.';
        return jsonResponse(500, { message });
    }
}
//# sourceMappingURL=getAuditHistoryHandler.js.map