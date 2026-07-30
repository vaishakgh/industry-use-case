/**
 * resolveFraudReview handler.
 *
 * Records the Fraud_Analyst's identity and decision. Either clears the
 * fraud flag and signals resume at Fraud_Check stage, or sets the
 * Claim_Status to Denied.
 *
 * _Requirements: 6.6_
 */
import type { ClaimStatus, ISODateTimeString } from '@claims/shared';
/** The fraud analyst's decision on a flagged claim. */
export type FraudAnalystDecision = 'clear' | 'deny';
/** Input to the fraud review resolution handler. */
export interface ResolveFraudReviewInput {
    claimId: string;
    analystId: string;
    decision: FraudAnalystDecision;
    timestamp?: ISODateTimeString;
}
/** The result of resolving a fraud review. */
export interface FraudReviewResolution {
    claimId: string;
    analystId: string;
    decision: FraudAnalystDecision;
    /** The new claim status after applying the decision. */
    newClaimStatus: ClaimStatus;
    /** Whether the fraud flag was cleared. */
    fraudFlagCleared: boolean;
    timestamp: ISODateTimeString;
}
/**
 * Resolves a fraud analyst's review of a flagged claim.
 *
 * Decision outcomes:
 * - `clear`: removes the fraud flag, claim resumes lifecycle at Fraud_Check
 *   (which will now pass since the flag is cleared)
 * - `deny`: sets Claim_Status to Denied
 *
 * _Requirements: 6.6_
 */
export declare function resolveFraudReview(input: ResolveFraudReviewInput): FraudReviewResolution;
//# sourceMappingURL=resolveFraudReview.d.ts.map