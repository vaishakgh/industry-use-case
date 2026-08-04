import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * Lambda functions for all backend services.
 *
 * Each function gets least-privilege IAM permissions scoped to only the
 * tables/buckets it needs.
 *
 * _Requirements: All (deployment wiring)_
 */
export interface ComputeConstructProps {
  config: ClaimsManagementConfig;
  claimsTable: dynamodb.ITable;
  claimSessionsTable: dynamodb.ITable;
  auditLogTable: dynamodb.ITable;
  loginAttemptsTable: dynamodb.ITable;
  photosBucket: s3.IBucket;
  documentsBucket: s3.IBucket;
}

export class ComputeConstruct extends Construct {
  public readonly intakeAgentFn: lambda.Function;
  public readonly damageAssessmentFn: lambda.Function;
  public readonly fraudDetectionFn: lambda.Function;
  public readonly auditLogFn: lambda.Function;
  public readonly evaluateApprovalFn: lambda.Function;
  public readonly runPayoutFn: lambda.Function;
  public readonly notifyCustomerFn: lambda.Function;
  public readonly portalApiFn: lambda.Function;
  public readonly preAuthenticationFn: lambda.Function;

  constructor(scope: Construct, id: string, props: ComputeConstructProps) {
    super(scope, id);

    const { config } = props;
    const runtime = lambda.Runtime.NODEJS_20_X;
    const timeout = cdk.Duration.seconds(config.lambdaTimeoutSeconds);
    const memorySize = config.lambdaMemoryMb;

    const commonEnv: Record<string, string> = {
      CLAIMS_TABLE_NAME: props.claimsTable.tableName,
      CLAIMS_SESSIONS_TABLE_NAME: props.claimSessionsTable.tableName,
      AUDIT_LOG_TABLE_NAME: props.auditLogTable.tableName,
      STAGE: config.stage,
    };

    // ─── FNOL Intake Agent ─────────────────────────────────────────
    this.intakeAgentFn = new lambda.Function(this, 'IntakeAgentFn', {
      functionName: `${config.resourcePrefix}-intake-agent-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/intake-agent/dist'),
      memorySize,
      timeout,
      environment: {
        ...commonEnv,
        PHOTOS_BUCKET_NAME: props.photosBucket.bucketName,
      },
    });
    props.claimsTable.grantReadWriteData(this.intakeAgentFn);
    props.claimSessionsTable.grantReadWriteData(this.intakeAgentFn);
    props.auditLogTable.grantWriteData(this.intakeAgentFn);

    // ─── Damage Assessment ─────────────────────────────────────────
    this.damageAssessmentFn = new lambda.Function(this, 'DamageAssessmentFn', {
      functionName: `${config.resourcePrefix}-damage-assessment-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/damage-assessment/dist'),
      memorySize,
      timeout: cdk.Duration.seconds(60), // Rekognition calls can take longer
      environment: {
        ...commonEnv,
        PHOTOS_BUCKET_NAME: props.photosBucket.bucketName,
      },
    });
    props.claimsTable.grantReadWriteData(this.damageAssessmentFn);
    props.photosBucket.grantRead(this.damageAssessmentFn);
    props.auditLogTable.grantWriteData(this.damageAssessmentFn);
    // Rekognition access
    this.damageAssessmentFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['rekognition:DetectLabels', 'rekognition:DetectModerationLabels'],
      resources: ['*'],
    }));

    // ─── Fraud Detection ───────────────────────────────────────────
    this.fraudDetectionFn = new lambda.Function(this, 'FraudDetectionFn', {
      functionName: `${config.resourcePrefix}-fraud-detection-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/fraud-detection/dist'),
      memorySize,
      timeout,
      environment: commonEnv,
    });
    props.claimsTable.grantReadWriteData(this.fraudDetectionFn);
    props.auditLogTable.grantWriteData(this.fraudDetectionFn);

    // ─── Audit Log Service ─────────────────────────────────────────
    this.auditLogFn = new lambda.Function(this, 'AuditLogFn', {
      functionName: `${config.resourcePrefix}-audit-log-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/audit-log/dist'),
      memorySize,
      timeout,
      environment: {
        AUDIT_LOG_TABLE_NAME: props.auditLogTable.tableName,
        STAGE: config.stage,
      },
    });
    props.auditLogTable.grantReadWriteData(this.auditLogFn);

    // ─── Evaluate Approval (Orchestrator) ──────────────────────────
    this.evaluateApprovalFn = new lambda.Function(this, 'EvaluateApprovalFn', {
      functionName: `${config.resourcePrefix}-evaluate-approval-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/orchestrator/dist'),
      memorySize,
      timeout,
      environment: commonEnv,
    });
    props.claimsTable.grantReadWriteData(this.evaluateApprovalFn);
    props.auditLogTable.grantWriteData(this.evaluateApprovalFn);

    // ─── Run Payout ────────────────────────────────────────────────
    this.runPayoutFn = new lambda.Function(this, 'RunPayoutFn', {
      functionName: `${config.resourcePrefix}-run-payout-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/orchestrator/dist'),
      memorySize,
      timeout,
      environment: commonEnv,
    });
    props.claimsTable.grantReadWriteData(this.runPayoutFn);
    props.auditLogTable.grantWriteData(this.runPayoutFn);

    // ─── Notify Customer ───────────────────────────────────────────
    this.notifyCustomerFn = new lambda.Function(this, 'NotifyCustomerFn', {
      functionName: `${config.resourcePrefix}-notify-customer-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/orchestrator/dist'),
      memorySize,
      timeout,
      environment: {
        ...commonEnv,
      },
    });
    props.claimsTable.grantReadData(this.notifyCustomerFn);
    // SES send permission
    this.notifyCustomerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // ─── Portal API ────────────────────────────────────────────────
    this.portalApiFn = new lambda.Function(this, 'PortalApiFn', {
      functionName: `${config.resourcePrefix}-portal-api-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/portal/dist'),
      memorySize,
      timeout,
      environment: {
        ...commonEnv,
        DOCUMENTS_BUCKET_NAME: props.documentsBucket.bucketName,
        LOGIN_ATTEMPTS_TABLE_NAME: props.loginAttemptsTable.tableName,
      },
    });
    props.claimsTable.grantReadWriteData(this.portalApiFn);
    props.documentsBucket.grantReadWrite(this.portalApiFn);
    props.auditLogTable.grantReadData(this.portalApiFn);
    props.loginAttemptsTable.grantReadWriteData(this.portalApiFn);

    // ─── PreAuthentication Trigger ─────────────────────────────────
    this.preAuthenticationFn = new lambda.Function(this, 'PreAuthenticationFn', {
      functionName: `${config.resourcePrefix}-pre-auth-${config.stage}`,
      runtime,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/services/portal/dist'),
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        LOGIN_ATTEMPTS_TABLE_NAME: props.loginAttemptsTable.tableName,
      },
    });
    props.loginAttemptsTable.grantReadWriteData(this.preAuthenticationFn);
  }
}
