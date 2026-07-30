"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEmailMessage = normalizeEmailMessage;
/**
 * Normalizes an inbound email payload into a single `ChannelMessage`.
 * `rawText` is the subject (if present) and body concatenated, so that
 * claim-relevant content mentioned only in the subject line is not lost.
 */
function normalizeEmailMessage(emailPayload) {
    const rawText = [emailPayload.subject?.trim(), emailPayload.body?.trim()]
        .filter((part) => Boolean(part && part.length > 0))
        .join('\n\n');
    return {
        channel: 'Email',
        rawText,
        claimIdHint: emailPayload.claimId,
        policyNumberHint: emailPayload.policyNumber,
        timestamp: emailPayload.receivedAt ?? new Date().toISOString(),
    };
}
//# sourceMappingURL=normalizeEmailMessage.js.map