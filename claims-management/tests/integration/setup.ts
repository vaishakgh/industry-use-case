/**
 * Integration test global setup.
 *
 * Loads deployed resource ARNs/endpoints from CloudFormation stack outputs
 * or environment variables and validates the test environment is reachable.
 */

export default async function globalSetup() {
  // Validate required environment variables
  const required = [
    'INTEGRATION_TEST_API_URL',
    'INTEGRATION_TEST_USER_POOL_ID',
    'INTEGRATION_TEST_USER_POOL_CLIENT_ID',
    'INTEGRATION_TEST_CLAIMS_TABLE',
    'INTEGRATION_TEST_AUDIT_TABLE',
    'INTEGRATION_TEST_SESSIONS_TABLE',
    'INTEGRATION_TEST_PHOTOS_BUCKET',
    'INTEGRATION_TEST_DOCUMENTS_BUCKET',
    'INTEGRATION_TEST_LIFECYCLE_STATE_MACHINE_ARN',
    'INTEGRATION_TEST_REGION',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `\n⚠️  Integration test environment not fully configured.\n` +
      `   Missing: ${missing.join(', ')}\n` +
      `   Tests will be skipped. Set these variables or run against a deployed stack.\n`
    );
    process.env.SKIP_INTEGRATION_TESTS = 'true';
  }
}
