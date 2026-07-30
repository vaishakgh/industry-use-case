/**
 * Email channel normalization.
 *
 * See design.md, "Intake Channel Adapters":
 * > Email: Inbound mail arrives via SES, triggering a Lambda that extracts
 * > the email body/attachments and invokes the FNOL Intake Agent with the
 * > raw text (Req 1.2).
 *
 * Unparseable-content handling (Req 1.7) is implemented separately
 * (task 6.5); this module only covers normalization.
 *
 * _Requirements: 1.2_
 */
import type { ChannelMessage } from './channelMessage';
/** Inbound email payload, as delivered by the SES-triggered Lambda. */
export interface EmailPayload {
    from: string;
    subject?: string;
    body: string;
    /** ISO-8601 timestamp the email was received. Defaults to `new Date().toISOString()` if omitted. */
    receivedAt?: string;
    /**
     * An explicit claim id, when the email is a reply/continuation of an
     * existing claim thread and the id is available directly on the payload
     * (e.g., parsed from an "In-Reply-To" claim reference header or a
     * structured resume field) rather than needing to be inferred from the
     * unstructured body text.
     */
    claimId?: string;
    /** An explicit policy number, when trivially available on the payload structure itself. */
    policyNumber?: string;
}
/**
 * Normalizes an inbound email payload into a single `ChannelMessage`.
 * `rawText` is the subject (if present) and body concatenated, so that
 * claim-relevant content mentioned only in the subject line is not lost.
 */
export declare function normalizeEmailMessage(emailPayload: EmailPayload): ChannelMessage;
//# sourceMappingURL=normalizeEmailMessage.d.ts.map