"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executePayout = executePayout;
/**
 * Executes the payout for an approved claim.
 *
 * Uses the Claim_ID as the idempotency key, ensuring that retries or
 * duplicate invocations never result in double-payment (Req 7.7).
 *
 * @returns The payout result with Claim_Status set to Paid on success
 * @throws If the payment initiation fails for a non-idempotent reason
 */
async function executePayout(input, paymentClient) {
    const timestamp = input.timestamp ?? new Date().toISOString();
    const idempotencyKey = input.claimId; // Claim_ID as idempotency key per Req 7.7
    const paymentInitiated = await paymentClient.initiatePayment(idempotencyKey, input.approvedAmount);
    return {
        claimId: input.claimId,
        newClaimStatus: 'Paid',
        paymentInitiated,
        idempotencyKey,
        timestamp,
    };
}
//# sourceMappingURL=payoutIdempotency.js.map