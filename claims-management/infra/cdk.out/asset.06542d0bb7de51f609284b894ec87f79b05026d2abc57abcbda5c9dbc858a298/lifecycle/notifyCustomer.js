"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFIABLE_STATUSES = void 0;
exports.isNotifiableStatus = isNotifiableStatus;
exports.buildCustomerNotification = buildCustomerNotification;
/** Terminal statuses that trigger customer notification. */
exports.NOTIFIABLE_STATUSES = ['Approved', 'Denied', 'Paid', 'Resolved'];
/** Whether a status warrants customer notification. */
function isNotifiableStatus(status) {
    return exports.NOTIFIABLE_STATUSES.includes(status);
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
function buildCustomerNotification(claimId, originalChannel, newStatus) {
    if (!isNotifiableStatus(newStatus)) {
        return null;
    }
    const statusMessages = {
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
//# sourceMappingURL=notifyCustomer.js.map