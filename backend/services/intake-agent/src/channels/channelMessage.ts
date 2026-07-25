/**
 * ChannelMessage: the channel-agnostic shape that every intake channel
 * adapter (Voice, Email, Chat) normalizes its raw payload into before
 * invoking the FNOL Intake Agent's extraction/session logic.
 *
 * See design.md, "Intake Channel Adapters":
 * > All three adapters normalize into a single internal `ChannelMessage`
 * > shape (`channel`, `rawText`, `claimIdHint?`, `policyNumberHint?`,
 * > `timestamp`) before invoking the agent, so the agent's extraction
 * > logic is channel-agnostic.
 *
 * `claimIdHint`/`policyNumberHint` are only populated when the input
 * payload structure itself trivially provides them (e.g., an explicit
 * `claimId` field on a resume request) -- best-effort extraction of these
 * hints from unstructured `rawText` is out of scope here and is handled by
 * later extraction/session-lookup tasks (7.x, 6.7).
 *
 * _Requirements: 1.1, 1.2, 1.3_
 */
import type { Channel } from '@claims/shared';

export interface ChannelMessage {
  channel: Channel;
  rawText: string;
  claimIdHint?: string;
  policyNumberHint?: string;
  /** ISO-8601 timestamp string marking when the message was received. */
  timestamp: string;
}
