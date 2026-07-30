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
exports.recordFraudAnalystDecision = exports.recordFraudFlagDecision = exports.resolveFraudReview = exports.FRAUD_DETECTION_PACKAGE_NAME = void 0;
/**
 * @claims/fraud-detection
 *
 * Fraud Detection Service: evaluates claim frequency, timeline consistency,
 * and sanctions/watchlist screening to produce Fraud_Indicators and apply
 * Fraud_Flags to Claims.
 */
exports.FRAUD_DETECTION_PACKAGE_NAME = '@claims/fraud-detection';
__exportStar(require("./screening"), exports);
__exportStar(require("./checks"), exports);
var resolveFraudReview_1 = require("./resolveFraudReview");
Object.defineProperty(exports, "resolveFraudReview", { enumerable: true, get: function () { return resolveFraudReview_1.resolveFraudReview; } });
var auditIntegration_1 = require("./auditIntegration");
Object.defineProperty(exports, "recordFraudFlagDecision", { enumerable: true, get: function () { return auditIntegration_1.recordFraudFlagDecision; } });
Object.defineProperty(exports, "recordFraudAnalystDecision", { enumerable: true, get: function () { return auditIntegration_1.recordFraudAnalystDecision; } });
//# sourceMappingURL=index.js.map