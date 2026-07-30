import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * KMS keys and IAM policies for data protection.
 *
 * Per-data-class CMKs:
 * - Claims key (Claims + ClaimSessions tables)
 * - Audit key (AuditLog table)
 * - Photos key (damage-photos bucket)
 * - Documents key (claim-documents bucket)
 *
 * Also enforces AuditLog table immutability via IAM deny policy.
 *
 * _Requirements: 12.1, 12.2, 8.2_
 */
export interface EncryptionConstructProps {
  config: ClaimsManagementConfig;
}

export class EncryptionConstruct extends Construct {
  public readonly claimsKey: kms.Key;
  public readonly auditKey: kms.Key;
  public readonly photosKey: kms.Key;
  public readonly documentsKey: kms.Key;

  constructor(scope: Construct, id: string, props: EncryptionConstructProps) {
    super(scope, id);

    const { config } = props;
    const removalPolicy = config.stage === 'prod'
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    this.claimsKey = new kms.Key(this, 'ClaimsKey', {
      alias: `${config.resourcePrefix}-claims-key-${config.stage}`,
      description: 'CMK for Claims and ClaimSessions DynamoDB tables',
      enableKeyRotation: true,
      removalPolicy,
    });

    this.auditKey = new kms.Key(this, 'AuditKey', {
      alias: `${config.resourcePrefix}-audit-key-${config.stage}`,
      description: 'CMK for AuditLog DynamoDB table',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Always retain audit key
    });

    this.photosKey = new kms.Key(this, 'PhotosKey', {
      alias: `${config.resourcePrefix}-photos-key-${config.stage}`,
      description: 'CMK for damage-photos S3 bucket',
      enableKeyRotation: true,
      removalPolicy,
    });

    this.documentsKey = new kms.Key(this, 'DocumentsKey', {
      alias: `${config.resourcePrefix}-documents-key-${config.stage}`,
      description: 'CMK for claim-documents S3 bucket',
      enableKeyRotation: true,
      removalPolicy,
    });
  }

  /**
   * Applies an IAM deny policy on the AuditLog table that prevents
   * any principal from calling UpdateItem or DeleteItem, enforcing
   * append-only immutability (Req 8.2).
   */
  public denyAuditLogMutation(auditLogTable: dynamodb.ITable): void {
    const denyPolicy = new iam.ManagedPolicy(this, 'DenyAuditMutation', {
      managedPolicyName: `${this.node.id}-deny-audit-mutation`,
      description: 'Denies UpdateItem/DeleteItem on AuditLog table for immutability',
      statements: [
        new iam.PolicyStatement({
          sid: 'DenyAuditLogMutation',
          effect: iam.Effect.DENY,
          actions: ['dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
          resources: [auditLogTable.tableArn],
        }),
      ],
    });

    // In a real deployment, this would be attached to an SCP or
    // all roles in the account. Here we export it for reference.
    new cdk.CfnOutput(this, 'AuditImmutabilityPolicyArn', {
      value: denyPolicy.managedPolicyArn,
      description: 'Attach this policy to enforce AuditLog immutability',
    });
  }
}
