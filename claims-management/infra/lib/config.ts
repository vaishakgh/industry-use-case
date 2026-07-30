/**
 * Environment configuration for the Claims Management CDK stack.
 *
 * Values can be overridden via CDK context or environment variables
 * for different deployment stages (dev, staging, prod).
 */

export interface ClaimsManagementConfig {
  /** Deployment stage name (dev, staging, prod). */
  stage: string;
  /** AWS account ID for deployment. */
  accountId: string;
  /** AWS region for deployment. */
  region: string;
  /** Prefix for all resource names to avoid collisions. */
  resourcePrefix: string;

  // --- DynamoDB ---
  /** DynamoDB billing mode. ON_DEMAND for dev, PROVISIONED for prod. */
  dynamoDbBillingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';

  // --- Lambda ---
  /** Default Lambda memory in MB. */
  lambdaMemoryMb: number;
  /** Default Lambda timeout in seconds. */
  lambdaTimeoutSeconds: number;

  // --- Cognito ---
  /** Minimum password length for the User Pool. */
  passwordMinLength: number;

  // --- Step Functions ---
  /** Stage retry max attempts (maps to SystemConfig.stageRetryMaxAttempts). */
  stageRetryMaxAttempts: number;
  /** Stage retry backoff in seconds. */
  stageRetryBackoffSeconds: number;

  // --- Amplify ---
  /** Git repository URL for Amplify Hosting (empty = skip Amplify setup). */
  amplifyRepoUrl: string;
  /** Git branch for Amplify Hosting deployments. */
  amplifyBranch: string;
}

/** Default configuration for development environment. */
export const DEFAULT_CONFIG: ClaimsManagementConfig = {
  stage: 'dev',
  accountId: process.env.CDK_DEFAULT_ACCOUNT ?? '',
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  resourcePrefix: 'claims',

  dynamoDbBillingMode: 'PAY_PER_REQUEST',

  lambdaMemoryMb: 256,
  lambdaTimeoutSeconds: 30,

  passwordMinLength: 8,

  stageRetryMaxAttempts: 3,
  stageRetryBackoffSeconds: 5,

  amplifyRepoUrl: '',
  amplifyBranch: 'main',
};

/**
 * Resolves configuration from CDK context, environment variables,
 * and defaults.
 */
export function resolveConfig(contextOverrides: Partial<ClaimsManagementConfig> = {}): ClaimsManagementConfig {
  return { ...DEFAULT_CONFIG, ...contextOverrides };
}
