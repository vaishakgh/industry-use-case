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
exports.ORCHESTRATOR_PACKAGE_NAME = void 0;
/**
 * @claims/orchestrator
 *
 * Claims Orchestrator: drives each Claim through its lifecycle stages
 * (Intake -> Assessment -> Fraud_Check -> Payout/Disputed), implementing
 * the ClaimLifecycleWorkflow and DisputeResolutionWorkflow state machine
 * logic, retry/backoff classification, and terminal-status notification.
 *
 * The `Claims` table access layer (task 3.1) is exported below. Lifecycle
 * state machine logic is implemented in later tasks (12.x, 14.x).
 */
exports.ORCHESTRATOR_PACKAGE_NAME = '@claims/orchestrator';
__exportStar(require("./repository/claimsRepository"), exports);
__exportStar(require("./lifecycle"), exports);
__exportStar(require("./dispute"), exports);
//# sourceMappingURL=index.js.map