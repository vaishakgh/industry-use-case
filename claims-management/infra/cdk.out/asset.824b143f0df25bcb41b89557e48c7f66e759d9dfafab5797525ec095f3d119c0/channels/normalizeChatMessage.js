"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeChatMessage = normalizeChatMessage;
/**
 * Normalizes an inbound chat payload into a single `ChannelMessage`.
 */
function normalizeChatMessage(chatPayload) {
    return {
        channel: 'Chat',
        rawText: chatPayload.message?.trim() ?? '',
        claimIdHint: chatPayload.claimId,
        policyNumberHint: chatPayload.policyNumber,
        timestamp: chatPayload.sentAt ?? new Date().toISOString(),
    };
}
//# sourceMappingURL=normalizeChatMessage.js.map