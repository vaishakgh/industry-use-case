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
export declare const NOTIFIABLE_STATUSES: ClaimStatus[];
/** The notification to be delivered. */
export interface CustomerNotification {
    claimId: string;
    channel: Channel;
    status: ClaimStatus;
    message: string;
}
/** Whether a status warrants customer notification. */
export declare function isNotifiableStatus(status: ClaimStatus): boolean;
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
export declare function buildCustomerNotification(claimId: string, originalChannel: Channel, newStatus: ClaimStatus): CustomerNotification | null;
//# sourceMappingURL=notifyCustomer.d.ts.map