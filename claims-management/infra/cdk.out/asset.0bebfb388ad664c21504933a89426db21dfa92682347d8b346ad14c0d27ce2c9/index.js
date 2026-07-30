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
exports.INTAKE_AGENT_PACKAGE_NAME = void 0;
/**
 * @claims/intake-agent
 *
 * FNOL Intake Agent: receives claim reports across Voice, Email, and Chat
 * channels, normalizes them into a channel-agnostic ChannelMessage shape,
 * extracts Structured_Claim_Fields, and maintains cross-channel conversation
 * continuity.
 *
 * Placeholder module populated by task 1.1 (project scaffolding). Channel
 * adapters and extraction/session logic are implemented in later tasks
 * (6.x, 7.x).
 */
exports.INTAKE_AGENT_PACKAGE_NAME = '@claims/intake-agent';
__exportStar(require("./claim"), exports);
__exportStar(require("./claimSessions"), exports);
__exportStar(require("./channels"), exports);
__exportStar(require("./session"), exports);
__exportStar(require("./extraction"), exports);
//# sourceMappingURL=index.js.map