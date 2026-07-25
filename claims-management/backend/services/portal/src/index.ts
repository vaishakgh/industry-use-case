/**
 * @claims/portal
 *
 * Customer Portal API: Cognito-authenticated endpoints for claim status
 * and history viewing, document upload, and dispute submission, gated by
 * the claim-ownership authorization predicate.
 *
 * The Cognito authentication integration (task 15.1) is exported below.
 * Session/lockout logic and claim-access endpoint logic are implemented
 * in later tasks (15.x, 16.x).
 */
export const PORTAL_PACKAGE_NAME = '@claims/portal';

export * from './auth';
