/**
 * Claim-ownership authorization predicate.
 *
 * Permits an operation if and only if the authenticated customer's id is
 * present in the Claim's policyholderIds. Denies with a generic "claim
 * not accessible" message that does not reveal whether the claim exists.
 *
 * _Requirements: 9.4, 9.5, 10.5, 10.6_
 */
/** The result of the ownership check. */
export type OwnershipCheckResult = {
    authorized: true;
} | {
    authorized: false;
    message: string;
};
/** The generic denial message (does not reveal claim existence). */
export declare const CLAIM_NOT_ACCESSIBLE_MESSAGE = "The requested claim is not accessible.";
/**
 * Checks whether a customer is authorized to access a claim.
 *
 * @param customerId The authenticated customer's id
 * @param policyholderIds The claim's list of authorized policyholder ids (or null if claim not found)
 * @returns Authorization result
 */
export declare function checkClaimOwnership(customerId: string, policyholderIds: string[] | null): OwnershipCheckResult;
//# sourceMappingURL=claimOwnership.d.ts.map