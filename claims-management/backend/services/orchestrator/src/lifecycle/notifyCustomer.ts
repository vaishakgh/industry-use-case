/**
 * Notify Customer Lambda logic.
 *
 * Looks up the original channel on the Claim and delivers terminal-status
 * notifications through that channel for Approved, Denied, Paid, and
 * Resolved statuses.
 *
 * _Requirements: 7.8_
 */
import type { Channel, ClaimStatus } from '@claims/shared';

/** Terminal statuses that trigger customer notification. */
export const NOTIFIABLE_STATUSES: ClaimStatus[] = ['Approved', 'Denied', 'Paid', 'Resolved'];

/** The notification to be delivered. */
export interface CustomerNotification {
  claimId: string;
  channel: Channel;
  status: ClaimStatus;
  message: string;
}

/** Whether a status warrants customer notification. */
export function isNotifiableStatus(status: ClaimStatus): boolean {
  return NOTIFIABLE_STATUSES.includes(status);
}

/**
 * Builds a customer notification for a terminal status change.
 *
 * Routes the notification through the claim's original intake channel
 * (Req 7.8 / Property 29).
 *
 * @param claimId The claim identifier
 * @param originalChannel The channel the customer originally used for intake
 * @param newStatus The terminal status to notify about
 * @returns The notification payload, or null if the status is not notifiable
 */
export function buildCustomerNotification(
  claimId: string,
  originalChannel: Channel,
  newStatus: ClaimStatus,
): CustomerNotification | null {
  if (!isNotifiableStatus(newStatus)) {
    return null;
  }

  const statusMessages: Record<string, string> = {
    Approved: 'Your claim has been approved.',
    Denied: 'Your claim has been denied. You may submit a dispute if you disagree with this decision.',
    Paid: 'Payment for your claim has been processed.',
    Resolved: 'Your dispute has been resolved.',
  };

  return {
    claimId,
    channel: originalChannel,
    status: newStatus,
    message: statusMessages[newStatus] ?? `Your claim status has been updated to ${newStatus}.`,
  };
}
