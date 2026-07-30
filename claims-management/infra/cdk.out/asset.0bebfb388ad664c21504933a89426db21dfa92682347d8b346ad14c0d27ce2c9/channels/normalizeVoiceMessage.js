"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeVoiceMessage = normalizeVoiceMessage;
/**
 * Normalizes a sequence of Transcribe segments for a single voice
 * interaction into one `ChannelMessage`. Segment texts are concatenated in
 * order, separated by a single space, to form `rawText`.
 *
 * `claimIdHint`/`policyNumberHint` are only set when explicitly supplied by
 * the caller (e.g., the Connect contact flow already knows the caller's
 * claim/session) -- they are never inferred from `rawText` here.
 */
function normalizeVoiceMessage(transcribedSegments, options = {}) {
    const rawText = transcribedSegments
        .map((segment) => segment.text.trim())
        .filter((text) => text.length > 0)
        .join(' ');
    return {
        channel: 'Voice',
        rawText,
        claimIdHint: options.claimIdHint,
        policyNumberHint: options.policyNumberHint,
        timestamp: options.timestamp ?? new Date().toISOString(),
    };
}
//# sourceMappingURL=normalizeVoiceMessage.js.map