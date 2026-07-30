/**
 * Integration test environment configuration.
 *
 * Reads deployed resource identifiers from environment variables.
 * All integration tests skip gracefully if the environment is not configured.
 */

export interface IntegrationTestEnv {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  claimsTable: string;
  auditTable: string;
  sessionsTable: string;
  photosBucket: string;
  documentsBucket: string;
  lifecycleStateMachineArn: string;
  region: string;
}

export function getTestEnv(): IntegrationTestEnv {
  return {
    apiUrl: process.env.INTEGRATION_TEST_API_URL ?? '',
    userPoolId: process.env.INTEGRATION_TEST_USER_POOL_ID ?? '',
    userPoolClientId: process.env.INTEGRATION_TEST_USER_POOL_CLIENT_ID ?? '',
    claimsTable: process.env.INTEGRATION_TEST_CLAIMS_TABLE ?? '',
    auditTable: process.env.INTEGRATION_TEST_AUDIT_TABLE ?? '',
    sessionsTable: process.env.INTEGRATION_TEST_SESSIONS_TABLE ?? '',
    photosBucket: process.env.INTEGRATION_TEST_PHOTOS_BUCKET ?? '',
    documentsBucket: process.env.INTEGRATION_TEST_DOCUMENTS_BUCKET ?? '',
    lifecycleStateMachineArn: process.env.INTEGRATION_TEST_LIFECYCLE_STATE_MACHINE_ARN ?? '',
    region: process.env.INTEGRATION_TEST_REGION ?? 'us-east-1',
  };
}

export function shouldSkip(): boolean {
  return process.env.SKIP_INTEGRATION_TESTS === 'true';
}

/**
 * Helper to conditionally skip a test suite when the integration
 * environment is not available.
 */
export function describeIntegration(name: string, fn: () => void): void {
  if (shouldSkip()) {
    describe.skip(`[SKIPPED - no env] ${name}`, fn);
  } else {
    describe(name, fn);
  }
}
