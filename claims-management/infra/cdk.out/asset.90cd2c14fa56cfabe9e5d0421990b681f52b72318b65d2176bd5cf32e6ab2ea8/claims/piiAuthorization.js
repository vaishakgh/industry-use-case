"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PII_AUTHORIZED_ROLES = void 0;
exports.checkPiiAccess = checkPiiAccess;
exports.evaluatePiiAccessWithAudit = evaluatePiiAccessWithAudit;
/** Roles authorized to access PII. */
exports.PII_AUTHORIZED_ROLES = ['Human_Adjuster', 'Fraud_Analyst', 'ComplianceOfficer'];
/**
 * Checks whether a requester is authorized to access PII.
 *
 * @param requesterRole The role of the requester
 * @param isSystemComponent Whether the requester is an authorized system component
 */
function checkPiiAccess(requesterRole, isSystemComponent) {
    if (isSystemComponent) {
        return { granted: true };
    }
    if (requesterRole && exports.PII_AUTHORIZED_ROLES.includes(requesterRole)) {
        return { granted: true };
    }
    return {
        granted: false,
        reason: 'Access to personally identifiable information is restricted to authorized roles.',
    };
}
/**
 * Evaluates PII access and records a denial audit event if access is denied.
 */
async function evaluatePiiAccessWithAudit(claimId, requesterId, requesterRole, isSystemComponent, recordDenial) {
    const result = checkPiiAccess(requesterRole, isSystemComponent);
    if (!result.granted) {
        await recordDenial({
            decisionType: 'AccessDenied',
            claimId,
            inputs: { requesterId, requesterRole, isSystemComponent },
            confidenceScore: null,
            timestamp: new Date().toISOString(),
            fraudIndicators: null,
            actorType: 'System',
            actorId: requesterId,
        });
    }
    return result;
}
//# sourceMappingURL=piiAuthorization.js.map