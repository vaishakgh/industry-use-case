/**
 * Voice channel normalization.
 *
 * See design.md, "Intake Channel Adapters":
 * > Voice: Amazon Connect contact flow streams caller audio to Amazon
 * > Transcribe (streaming API). Transcribed segments, together with a
 * > per-segment confidence score, are forwarded to the FNOL Intake Agent.
 *
 * This module only covers normalizing the transcribed segments into a
 * single `ChannelMessage` (Req 1.1). Confidence-threshold-driven
 * confirm/restate prompting and the `voiceRetryCount` counter are
 * implemented separately (task 6.2).
 *
 * _Requirements: 1.1_
 */
import type { ChannelMessage } from './channelMessage';
/** A single Amazon Transcribe segment: recognized text plus its confidence score. */
export interface TranscribedSegment {
    text: string;
    /** Transcription confidence in [0, 1]. */
    confidence: number;
}
export interface VoiceMessageOptions {
    /** Known `Claim_ID` for this voice session (e.g., an in-progress resumed session), if any. */
    claimIdHint?: string;
    /** Known policy number for this voice session, if any. */
    policyNumberHint?: string;
    /** ISO-8601 timestamp to use. Defaults to `new Date().toISOString()`. */
    timestamp?: string;
}
/**
 * Normalizes a sequence of Transcribe segments for a single voice
 * interaction into one `ChannelMessage`. Segment texts are concatenated in
 * order, separated by a single space, to form `rawText`.
 *
 * `claimIdHint`/`policyNumberHint` are only set when explicitly supplied by
 * the caller (e.g., the Connect contact flow already knows the caller's
 * claim/session) -- they are never inferred from `rawText` here.
 */
export declare function normalizeVoiceMessage(transcribedSegments: TranscribedSegment[], options?: VoiceMessageOptions): ChannelMessage;
//# sourceMappingURL=normalizeVoiceMessage.d.ts.map