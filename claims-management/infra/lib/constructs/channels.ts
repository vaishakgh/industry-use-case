import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sesActions from 'aws-cdk-lib/aws-ses-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * SES and Amazon Connect integrations for intake channels.
 *
 * - SES receipt rule for inbound claim emails
 * - Amazon Connect integration (contact flow is configured
 *   outside CDK via the Connect console, but IAM permissions
 *   for Transcribe streaming are provisioned here)
 *
 * _Requirements: 1.1, 1.2_
 */
export interface ChannelsConstructProps {
  config: ClaimsManagementConfig;
  intakeAgentFn: lambda.IFunction;
}

export class ChannelsConstruct extends Construct {
  public readonly receiptRuleSet: ses.ReceiptRuleSet;

  constructor(scope: Construct, id: string, props: ChannelsConstructProps) {
    super(scope, id);

    const { config } = props;

    // ─── SES Receipt Rule for Email Channel ────────────────────────
    this.receiptRuleSet = new ses.ReceiptRuleSet(this, 'ClaimEmailRuleSet', {
      receiptRuleSetName: `${config.resourcePrefix}-claim-emails-${config.stage}`,
    });

    this.receiptRuleSet.addRule('InboundClaimEmail', {
      recipients: [`claims@${config.stage}.claims-portal.example.com`],
      actions: [
        new sesActions.Lambda({ function: props.intakeAgentFn }),
      ],
    });

    // Grant SES permission to invoke the Lambda
    props.intakeAgentFn.addPermission('SESInvoke', {
      principal: new iam.ServicePrincipal('ses.amazonaws.com'),
      action: 'lambda:InvokeFunction',
    });

    // ─── Amazon Connect / Transcribe Permissions ───────────────────
    // The Connect contact flow is configured in the Console.
    // Here we grant the Intake Agent Lambda permission to call
    // Amazon Transcribe for the Voice channel.
    props.intakeAgentFn.addToRolePolicy(new iam.PolicyStatement({
      sid: 'TranscribeStreamingAccess',
      actions: [
        'transcribe:StartStreamTranscription',
        'transcribe:StartTranscriptionJob',
        'transcribe:GetTranscriptionJob',
      ],
      resources: ['*'],
    }));
  }
}
