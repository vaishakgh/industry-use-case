import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * DynamoDB tables and GSIs for the Claims Management system.
 *
 * Tables:
 * - Claims (PK: claimId)
 * - ClaimSessions (PK: claimId, GSI: PolicyNumberStatusIndex on policyNumber+claimStatus)
 * - AuditLog (PK: logId, SK: claimId, GSI: ClaimIdIndex on claimId)
 * - LoginAttempts (PK: username, TTL-enabled)
 *
 * _Requirements: 3.1, 7.6, 8.2, 8.4, 9.3, 12.1_
 */
export interface DatabaseConstructProps {
  config: ClaimsManagementConfig;
  claimsEncryptionKey: kms.IKey;
  auditEncryptionKey: kms.IKey;
}

export class DatabaseConstruct extends Construct {
  public readonly claimsTable: dynamodb.Table;
  public readonly claimSessionsTable: dynamodb.Table;
  public readonly auditLogTable: dynamodb.Table;
  public readonly loginAttemptsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const { config, claimsEncryptionKey, auditEncryptionKey } = props;
    const billingMode = config.dynamoDbBillingMode === 'PROVISIONED'
      ? dynamodb.BillingMode.PROVISIONED
      : dynamodb.BillingMode.PAY_PER_REQUEST;

    // ─── Claims Table ──────────────────────────────────────────────
    this.claimsTable = new dynamodb.Table(this, 'ClaimsTable', {
      tableName: `${config.resourcePrefix}-claims-${config.stage}`,
      partitionKey: { name: 'claimId', type: dynamodb.AttributeType.STRING },
      billingMode,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: claimsEncryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: config.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ─── ClaimSessions Table ───────────────────────────────────────
    this.claimSessionsTable = new dynamodb.Table(this, 'ClaimSessionsTable', {
      tableName: `${config.resourcePrefix}-claim-sessions-${config.stage}`,
      partitionKey: { name: 'claimId', type: dynamodb.AttributeType.STRING },
      billingMode,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: claimsEncryptionKey,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: config.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI: PolicyNumberStatusIndex (PK: policyNumber, SK: claimStatus)
    this.claimSessionsTable.addGlobalSecondaryIndex({
      indexName: 'PolicyNumberStatusIndex',
      partitionKey: { name: 'policyNumber', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'claimStatus', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ─── AuditLog Table (append-only) ──────────────────────────────
    this.auditLogTable = new dynamodb.Table(this, 'AuditLogTable', {
      tableName: `${config.resourcePrefix}-audit-log-${config.stage}`,
      partitionKey: { name: 'logId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'claimId', type: dynamodb.AttributeType.STRING },
      billingMode,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: auditEncryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Always retain audit data
    });

    // GSI: ClaimIdIndex (PK: claimId) for chronological per-claim queries
    this.auditLogTable.addGlobalSecondaryIndex({
      indexName: 'ClaimIdIndex',
      partitionKey: { name: 'claimId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ─── LoginAttempts Table (TTL-based lockout tracking) ──────────
    this.loginAttemptsTable = new dynamodb.Table(this, 'LoginAttemptsTable', {
      tableName: `${config.resourcePrefix}-login-attempts-${config.stage}`,
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
      billingMode,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
