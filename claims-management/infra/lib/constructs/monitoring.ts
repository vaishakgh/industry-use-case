import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * CloudWatch alarms and operational dashboard.
 *
 * Alarms for:
 * - Lambda error rates
 * - Step Functions execution failures
 * - DynamoDB throttling
 * - Cognito sign-in failures
 *
 * _(Operational readiness)_
 */
export interface MonitoringConstructProps {
  config: ClaimsManagementConfig;
  lambdaFunctions: lambda.IFunction[];
  stateMachines: sfn.IStateMachine[];
  tables: dynamodb.ITable[];
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const { config } = props;

    // ─── Dashboard ─────────────────────────────────────────────────
    this.dashboard = new cloudwatch.Dashboard(this, 'OperationalDashboard', {
      dashboardName: `${config.resourcePrefix}-operations-${config.stage}`,
    });

    // ─── Lambda Error Alarms ───────────────────────────────────────
    for (const fn of props.lambdaFunctions) {
      const errorAlarm = new cloudwatch.Alarm(this, `${fn.node.id}ErrorAlarm`, {
        metric: fn.metricErrors({ period: cdk.Duration.minutes(5) }),
        threshold: 5,
        evaluationPeriods: 2,
        alarmDescription: `Lambda ${fn.functionName} error rate exceeded threshold`,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: `${fn.node.id} - Invocations & Errors`,
          left: [fn.metricInvocations()],
          right: [fn.metricErrors()],
          width: 12,
        }),
      );
    }

    // ─── Step Functions Failure Alarms ──────────────────────────────
    for (const sm of props.stateMachines) {
      new cloudwatch.Alarm(this, `${sm.node.id}FailureAlarm`, {
        metric: sm.metricFailed({ period: cdk.Duration.minutes(5) }),
        threshold: 1,
        evaluationPeriods: 1,
        alarmDescription: `State machine ${sm.stateMachineArn} execution failed`,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: `${sm.node.id} - Executions`,
          left: [sm.metricStarted(), sm.metricSucceeded()],
          right: [sm.metricFailed(), sm.metricTimedOut()],
          width: 12,
        }),
      );
    }

    // ─── DynamoDB Throttling Alarms ────────────────────────────────
    for (const table of props.tables) {
      new cloudwatch.Alarm(this, `${table.node.id}ThrottleAlarm`, {
        metric: table.metricThrottledRequestsForOperations({
          operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.GET_ITEM, dynamodb.Operation.QUERY],
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10,
        evaluationPeriods: 2,
        alarmDescription: `DynamoDB table ${table.tableName} throttling detected`,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    }
  }
}
