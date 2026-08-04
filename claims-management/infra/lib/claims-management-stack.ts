import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from './config';
import { EncryptionConstruct } from './constructs/encryption';
import { DatabaseConstruct } from './constructs/database';
import { StorageConstruct } from './constructs/storage';
import { AuthConstruct } from './constructs/auth';
import { ComputeConstruct } from './constructs/compute';
import { OrchestrationConstruct } from './constructs/orchestration';
import { ApiConstruct } from './constructs/api';
import { ChannelsConstruct } from './constructs/channels';
import { FrontendConstruct } from './constructs/frontend';
import { MonitoringConstruct } from './constructs/monitoring';

export interface ClaimsManagementStackProps extends cdk.StackProps {
  config: ClaimsManagementConfig;
}

/**
 * Main CDK stack assembling all Claims Management infrastructure.
 *
 * Construction order respects resource dependencies:
 * 1. Encryption (KMS keys needed by everything else)
 * 2. Database (DynamoDB tables encrypted with KMS)
 * 3. Storage (S3 buckets encrypted with KMS)
 * 4. Compute (Lambda functions referencing tables/buckets)
 * 5. Auth (Cognito with PreAuth Lambda trigger)
 * 6. Orchestration (Step Functions referencing Lambdas)
 * 7. API (API Gateway referencing Cognito + portal Lambda)
 * 8. Channels (SES/Connect referencing intake Lambda)
 * 9. Frontend (Amplify referencing API + Cognito)
 * 10. Monitoring (CloudWatch referencing all resources)
 */
export class ClaimsManagementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ClaimsManagementStackProps) {
    super(scope, id, props);

    const { config } = props;

    // 1. Encryption — KMS keys
    const encryption = new EncryptionConstruct(this, 'Encryption', { config });

    // 2. Database — DynamoDB tables
    const database = new DatabaseConstruct(this, 'Database', {
      config,
      claimsEncryptionKey: encryption.claimsKey,
      auditEncryptionKey: encryption.auditKey,
    });

    // Enforce audit log immutability
    encryption.denyAuditLogMutation(database.auditLogTable);

    // 3. Storage — S3 buckets
    const storage = new StorageConstruct(this, 'Storage', {
      config,
      photosEncryptionKey: encryption.photosKey,
      documentsEncryptionKey: encryption.documentsKey,
    });

    // 4. Compute — Lambda functions
    const compute = new ComputeConstruct(this, 'Compute', {
      config,
      claimsTable: database.claimsTable,
      claimSessionsTable: database.claimSessionsTable,
      auditLogTable: database.auditLogTable,
      loginAttemptsTable: database.loginAttemptsTable,
      photosBucket: storage.photosBucket,
      documentsBucket: storage.documentsBucket,
    });

    // Grant KMS decrypt to Lambdas that read encrypted data
    encryption.claimsKey.grantDecrypt(compute.intakeAgentFn);
    encryption.claimsKey.grantDecrypt(compute.fraudDetectionFn);
    encryption.claimsKey.grantDecrypt(compute.evaluateApprovalFn);
    encryption.claimsKey.grantDecrypt(compute.portalApiFn);
    encryption.auditKey.grantDecrypt(compute.auditLogFn);
    encryption.auditKey.grantDecrypt(compute.portalApiFn);
    encryption.photosKey.grantDecrypt(compute.damageAssessmentFn);
    encryption.documentsKey.grantDecrypt(compute.portalApiFn);

    // 5. Auth — Cognito
    const auth = new AuthConstruct(this, 'Auth', {
      config,
      preAuthenticationFn: compute.preAuthenticationFn,
    });

    // 6. Orchestration — Step Functions
    const orchestration = new OrchestrationConstruct(this, 'Orchestration', {
      config,
      damageAssessmentFn: compute.damageAssessmentFn,
      fraudDetectionFn: compute.fraudDetectionFn,
      evaluateApprovalFn: compute.evaluateApprovalFn,
      runPayoutFn: compute.runPayoutFn,
      notifyCustomerFn: compute.notifyCustomerFn,
    });

    // 7. API — API Gateway
    const api = new ApiConstruct(this, 'Api', {
      config,
      portalApiFn: compute.portalApiFn,
      userPool: auth.userPool,
    });

    // Grant Intake Agent permission to start Step Functions executions
    orchestration.claimLifecycleStateMachine.grantStartExecution(compute.intakeAgentFn);
    compute.intakeAgentFn.addEnvironment(
      'LIFECYCLE_STATE_MACHINE_ARN',
      orchestration.claimLifecycleStateMachine.stateMachineArn,
    );

    // 8. Channels — SES + Connect
    new ChannelsConstruct(this, 'Channels', {
      config,
      intakeAgentFn: compute.intakeAgentFn,
    });

    // 9. Frontend — Amplify Hosting
    new FrontendConstruct(this, 'Frontend', {
      config,
      apiUrl: api.api.url,
      userPoolId: auth.userPool.userPoolId,
      userPoolClientId: auth.appClient.userPoolClientId,
    });

    // 10. Monitoring — CloudWatch
    new MonitoringConstruct(this, 'Monitoring', {
      config,
      lambdaFunctions: [
        compute.intakeAgentFn,
        compute.damageAssessmentFn,
        compute.fraudDetectionFn,
        compute.evaluateApprovalFn,
        compute.runPayoutFn,
        compute.notifyCustomerFn,
        compute.portalApiFn,
      ],
      stateMachines: [
        orchestration.claimLifecycleStateMachine,
        orchestration.disputeResolutionStateMachine,
      ],
      tables: [
        database.claimsTable,
        database.auditLogTable,
      ],
    });

    // ─── Stack Outputs ─────────────────────────────────────────────
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: auth.userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.appClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'ClaimsTableName', {
      value: database.claimsTable.tableName,
    });
    new cdk.CfnOutput(this, 'AuditLogTableName', {
      value: database.auditLogTable.tableName,
    });
    new cdk.CfnOutput(this, 'PhotosBucketName', {
      value: storage.photosBucket.bucketName,
    });
    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: storage.documentsBucket.bucketName,
    });
    new cdk.CfnOutput(this, 'ClaimLifecycleStateMachineArn', {
      value: orchestration.claimLifecycleStateMachine.stateMachineArn,
    });
  }
}
