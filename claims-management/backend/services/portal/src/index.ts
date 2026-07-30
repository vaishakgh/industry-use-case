/**
 * @claims/portal
 *
 * Customer Portal API: Cognito-authenticated endpoints for claim status
 * and history viewing, document upload, and dispute submission, gated by
 * the claim-ownership authorization predicate.
 */
export const PORTAL_PACKAGE_NAME = '@claims/portal';

export * from './auth';

export * from './claims';
