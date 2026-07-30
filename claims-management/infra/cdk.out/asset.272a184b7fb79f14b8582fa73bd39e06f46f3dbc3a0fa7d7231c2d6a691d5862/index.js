"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_LOG_PACKAGE_NAME = void 0;
/**
 * @claims/audit-log
 *
 * Audit Log Service: records every Automated_Decision (decision type,
 * inputs, confidence score, Claim_ID, timestamp) as an append-only record,
 * exposes chronological per-claim retrieval gated to compliance officers,
 * and provides the audit-write-precedes-effect wrapper used by every
 * decision-producing component.
 *
 * The DynamoDB access layer (task 2.1) is exported below. Handler logic
 * (recordAutomatedDecision, the audit-write-precedes-effect wrapper, and
 * the query handler) is implemented in later tasks (2.x).
 */
exports.AUDIT_LOG_PACKAGE_NAME = '@claims/audit-log';
__exportStar(require("./repository/auditLogRepository"), exports);
__exportStar(require("./recordAutomatedDecision"), exports);
__exportStar(require("./recordDecisionBeforeEffect"), exports);
__exportStar(require("./handlers/getAuditHistoryHandler"), exports);
//# sourceMappingURL=index.js.map