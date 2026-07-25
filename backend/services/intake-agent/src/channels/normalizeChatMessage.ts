/**
 * Chat channel normalization.
 *
 * See design.md, "Intake Channel Adapters":
 * > Chat: The Amplify web/chat widget calls the FNOL Intake Agent through a
 * > WebSocket or HTTP API (API Gateway), passing the raw chat message
 * > (Req 1.3).
 *
 * Unparseable-content handling (Req 1.7) is implemented separately
 * (task 6.5); this module only covers normalization.
 *
 * _Requirements: 1.3_
 */
import type { ChannelMessage } from './channelMessage';

/** Inbound chat/WebSocket message payload. */
export interface ChatPayload {
  message: string;
  /** ISO-8601 timestamp the message was sent/received. Defaults to `new Date().toISOString()` if omitted. */
  sentAt?: string;
  /**
   * An explicit claim id, when the chat client is resuming an existing
   * claim session and passes the id directly (e.g., a "resume claim"
   * request carrying a structured `claimId` field) rather than needing to
   * be inferred from the free-text message.
   */
  claimId?: string;
  /** An explicit policy number, when trivially available on the payload structure itself. */
  policyNumber?: string;
}

/**
 * Normalizes an inbound chat payload into a single `ChannelMessage`.
 */
export function normalizeChatMessage(chatPayload: ChatPayload): ChannelMessage {
  return {
    channel: 'Chat',
    rawText: chatPayload.message?.trim() ?? '',
    claimIdHint: chatPayload.claimId,
    policyNumberHint: chatPayload.policyNumber,
    timestamp: chatPayload.sentAt ?? new Date().toISOString(),
  };
}
