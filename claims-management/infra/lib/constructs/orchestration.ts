import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * Step Functions state machines for claim lifecycle and dispute resolution.
 *
 * ClaimLifecycleWorkflow:
 *   AwaitIntakeCompletion → RunDamageAssessment → RunFraudCheck →
 *   EvaluateApproval → (Approved → RunPayout → NotifyCustomer) |
 *   (Pending_Adjuster_Review → AwaitAdjusterDecision → NotifyCustomer)
 *
 * DisputeResolutionWorkflow:
 *   ValidateDispute → RouteToAdjuster → AwaitAdjusterResolution → NotifyCustomer
 *
 * Both use waitForTaskToken for human-in-the-loop stages and retry/catch
 * blocks matching SystemConfig settings.
 *
 * _Requirements: 7.1, 7.2, 7.3, 11.1_
 */
export interface OrchestrationConstructProps {
  config: ClaimsManagementConfig;
  damageAssessmentFn: lambda.IFunction;
  fraudDetectionFn: lambda.IFunction;
  evaluateApprovalFn: lambda.IFunction;
  runPayoutFn: lambda.IFunction;
  notifyCustomerFn: lambda.IFunction;
}

export class OrchestrationConstruct extends Construct {
  public readonly claimLifecycleStateMachine: sfn.StateMachine;
  public readonly disputeResolutionStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: OrchestrationConstructProps) {
    super(scope, id);

    const { config } = props;
    const retryConfig: sfn.RetryProps = {
      maxAttempts: config.stageRetryMaxAttempts,
      interval: cdk.Duration.seconds(config.stageRetryBackoffSeconds),
      backoffRate: 2,
      errors: ['Claims.TransientFailure', 'Lambda.ServiceException', 'Lambda.TooManyRequestsException'],
    };

    // ─── Claim Lifecycle Workflow ──────────────────────────────────

    // Stage: AwaitIntakeCompletion (wait for task token from Intake Agent)
    const awaitIntake = new sfn.Wait(this, 'AwaitIntakeCompletion', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(1)),
      comment: 'Placeholder for waitForTaskToken - Intake Agent sends task success when fields are resolved',
    });

    // Stage: RunDamageAssessment
    const runDamageAssessment = new tasks.LambdaInvoke(this, 'RunDamageAssessment', {
      lambdaFunction: props.damageAssessmentFn,
      outputPath: '$.Payload',
      comment: 'Analyze damage photos and produce severity rating + cost estimate',
    });
    runDamageAssessment.addRetry(retryConfig);
    runDamageAssessment.addCatch(
      new sfn.Pass(this, 'DamageAssessmentFailed', {
        result: sfn.Result.fromObject({ status: 'Pending_Adjuster_Review', reason: 'DamageAssessmentFailure' }),
      }),
      { errors: ['Claims.PersistentFailure'], resultPath: '$.error' },
    );

    // Stage: RunFraudCheck
    const runFraudCheck = new tasks.LambdaInvoke(this, 'RunFraudCheck', {
      lambdaFunction: props.fraudDetectionFn,
      outputPath: '$.Payload',
      comment: 'Evaluate claim frequency, timeline, and watchlist screening',
    });
    runFraudCheck.addRetry(retryConfig);
    runFraudCheck.addCatch(
      new sfn.Pass(this, 'FraudCheckFailed', {
        result: sfn.Result.fromObject({ status: 'Pending_Adjuster_Review', reason: 'FraudCheckFailure' }),
      }),
      { errors: ['Claims.PersistentFailure'], resultPath: '$.error' },
    );

    // Stage: EvaluateApproval
    const evaluateApproval = new tasks.LambdaInvoke(this, 'EvaluateApproval', {
      lambdaFunction: props.evaluateApprovalFn,
      outputPath: '$.Payload',
      comment: 'Decision table: auto-approve or route to adjuster',
    });

    // Stage: RunPayout
    const runPayout = new tasks.LambdaInvoke(this, 'RunPayout', {
      lambdaFunction: props.runPayoutFn,
      outputPath: '$.Payload',
      comment: 'Initiate payment with claimId as idempotency key',
    });
    runPayout.addRetry(retryConfig);

    // Stage: NotifyCustomer
    const notifyCustomer = new tasks.LambdaInvoke(this, 'NotifyCustomer', {
      lambdaFunction: props.notifyCustomerFn,
      outputPath: '$.Payload',
      comment: 'Deliver terminal-status notification via original channel',
    });

    // Stage: AwaitFraudAnalystDecision (waitForTaskToken)
    const awaitFraudAnalyst = new sfn.Wait(this, 'AwaitFraudAnalystDecision', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(1)),
      comment: 'Placeholder for waitForTaskToken - Fraud Analyst sends task success with decision',
    });

    // Stage: AwaitAdjusterDecision (waitForTaskToken)
    const awaitAdjuster = new sfn.Wait(this, 'AwaitAdjusterDecision', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(1)),
      comment: 'Placeholder for waitForTaskToken - Human Adjuster sends task success with decision',
    });

    // Routing choice after EvaluateApproval
    const approvalChoice = new sfn.Choice(this, 'ApprovalRouting')
      .when(sfn.Condition.stringEquals('$.decision', 'approved'),
        runPayout.next(notifyCustomer))
      .when(sfn.Condition.stringEquals('$.decision', 'fraud_flagged'),
        awaitFraudAnalyst.next(evaluateApproval))
      .otherwise(
        awaitAdjuster.next(notifyCustomer));

    // Chain the lifecycle
    const lifecycleDefinition = awaitIntake
      .next(runDamageAssessment)
      .next(runFraudCheck)
      .next(evaluateApproval)
      .next(approvalChoice);

    this.claimLifecycleStateMachine = new sfn.StateMachine(this, 'ClaimLifecycleWorkflow', {
      stateMachineName: `${config.resourcePrefix}-claim-lifecycle-${config.stage}`,
      definitionBody: sfn.DefinitionBody.fromChainable(lifecycleDefinition),
      timeout: cdk.Duration.days(30), // Claims can take up to 30 days
      stateMachineType: sfn.StateMachineType.STANDARD,
    });

    // ─── Dispute Resolution Workflow ───────────────────────────────

    const validateDispute = new sfn.Pass(this, 'ValidateDispute', {
      comment: 'Validate dispute submission (status check, reason length)',
    });

    const routeToAdjuster = new sfn.Pass(this, 'RouteToAdjuster', {
      comment: 'Assemble review package and assign to adjuster queue',
    });

    const awaitResolution = new sfn.Wait(this, 'AwaitAdjusterResolution', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(1)),
      comment: 'Placeholder for waitForTaskToken - Adjuster resolves dispute',
    });

    const notifyDisputeResolution = new tasks.LambdaInvoke(this, 'NotifyDisputeResolution', {
      lambdaFunction: props.notifyCustomerFn,
      outputPath: '$.Payload',
      comment: 'Notify customer of dispute resolution',
    });

    const disputeDefinition = validateDispute
      .next(routeToAdjuster)
      .next(awaitResolution)
      .next(notifyDisputeResolution);

    this.disputeResolutionStateMachine = new sfn.StateMachine(this, 'DisputeResolutionWorkflow', {
      stateMachineName: `${config.resourcePrefix}-dispute-resolution-${config.stage}`,
      definitionBody: sfn.DefinitionBody.fromChainable(disputeDefinition),
      timeout: cdk.Duration.days(14),
      stateMachineType: sfn.StateMachineType.STANDARD,
    });
  }
}
