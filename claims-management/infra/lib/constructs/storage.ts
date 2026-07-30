import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * S3 buckets for evidence storage (damage photos, claim documents).
 *
 * Both buckets enforce:
 * - Server-side encryption with KMS CMK (per data class)
 * - Versioning enabled
 * - Block all public access
 * - TLS-only access (aws:SecureTransport condition)
 * - CORS for the frontend
 * - Lifecycle policies for cost management
 *
 * _Requirements: 4.1, 10.2, 12.1, 12.2_
 */
export interface StorageConstructProps {
  config: ClaimsManagementConfig;
  photosEncryptionKey: kms.IKey;
  documentsEncryptionKey: kms.IKey;
}

export class StorageConstruct extends Construct {
  public readonly photosBucket: s3.Bucket;
  public readonly documentsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    const { config, photosEncryptionKey, documentsEncryptionKey } = props;

    // ─── Damage Photos Bucket ──────────────────────────────────────
    this.photosBucket = new s3.Bucket(this, 'DamagePhotosBucket', {
      bucketName: `${config.resourcePrefix}-damage-photos-${config.stage}-${config.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: photosEncryptionKey,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: config.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.stage !== 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.GET],
          allowedOrigins: ['*'], // Restrict to Amplify domain in prod
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          id: 'TransitionToIA',
          transitions: [
            { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(90) },
          ],
        },
      ],
    });

    // ─── Claim Documents Bucket ────────────────────────────────────
    this.documentsBucket = new s3.Bucket(this, 'ClaimDocumentsBucket', {
      bucketName: `${config.resourcePrefix}-claim-documents-${config.stage}-${config.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: documentsEncryptionKey,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: config.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.stage !== 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          id: 'TransitionToIA',
          transitions: [
            { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(90) },
          ],
        },
      ],
    });

    // Add explicit deny for non-HTTPS access (belt-and-suspenders with enforceSSL)
    this.addTlsDenyPolicy(this.photosBucket);
    this.addTlsDenyPolicy(this.documentsBucket);
  }

  private addTlsDenyPolicy(bucket: s3.Bucket): void {
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'DenyNonHTTPS',
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:*'],
      resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
      conditions: {
        Bool: { 'aws:SecureTransport': 'false' },
      },
    }));
  }
}
