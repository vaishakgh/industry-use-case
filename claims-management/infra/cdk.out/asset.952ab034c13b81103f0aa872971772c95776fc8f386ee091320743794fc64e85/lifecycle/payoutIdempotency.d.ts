/**
 * Payout idempotency and Paid transition.
 *
 * Uses Claim_ID as a payoutIdempotencyKey on the payment-initiation call
 * and sets Claim_Status to Paid on success.
 *
 * _Requirements: 7.7_
 */
import type { ClaimStatus, ISODateTimeString } from '@claims/shared';
/** The payment initiation contract. Implementations call the payment provider. */
export interface PaymentClient {
    /**
     * Initiates a payment with an idempotency key.
     * Returns true if the payment was successfully initiated (or already processed).
     * Throws on non-idempotent failure.
     */
    initiatePayment(idempotencyKey: string, amount: number): Promise<boolean>;
}
/** Input to the payout handler. */
export interface PayoutInput {
    claimId: string;
    approvedAmount: number;
    timestamp?: ISODateTimeString;
}
/** Result of the payout operation. */
export interface PayoutResult {
    claimId: string;
    newClaimStatus: ClaimStatus;
    paymentInitiated: boolean;
    idempotencyKey: string;
    timestamp: ISODateTimeString;
}
/**
 * Executes the payout for an approved claim.
 *
 * Uses the Claim_ID as the idempotency key, ensuring that retries or
 * duplicate invocations never result in double-payment (Req 7.7).
 *
 * @returns The payout result with Claim_Status set to Paid on success
 * @throws If the payment initiation fails for a non-idempotent reason
 */
export declare function executePayout(input: PayoutInput, paymentClient: PaymentClient): Promise<PayoutResult>;
//# sourceMappingURL=payoutIdempotency.d.ts.map