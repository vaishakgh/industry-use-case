import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * Cognito User Pool, App Client, and PreAuthentication Lambda trigger.
 *
 * - USER_PASSWORD_AUTH flow
 * - Custom password policy
 * - PreAuthentication Lambda trigger for lockout tracking
 * - Customer group
 *
 * _Requirements: 9.1, 9.2, 9.3_
 */
export interface AuthConstructProps {
  config: ClaimsManagementConfig;
  preAuthenticationFn?: lambda.IFunction;
}

export class AuthConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly appClient: cognito.UserPoolClient;
  public readonly customerGroup: cognito.CfnUserPoolGroup;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    const { config } = props;

    // ─── User Pool ─────────────────────────────────────────────────
    this.userPool = new cognito.UserPool(this, 'CustomerUserPool', {
      userPoolName: `${config.resourcePrefix}-customers-${config.stage}`,
      selfSignUpEnabled: false, // Customers are provisioned by the insurer
      signInAliases: { username: true, email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: config.passwordMinLength,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: config.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: true, mutable: true },
      },
      customAttributes: {
        policyNumber: new cognito.StringAttribute({ mutable: true }),
      },
    });

    // Attach PreAuthentication Lambda trigger (lockout tracking)
    if (props.preAuthenticationFn) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_AUTHENTICATION,
        props.preAuthenticationFn,
      );
    }

    // ─── App Client ────────────────────────────────────────────────
    this.appClient = this.userPool.addClient('PortalAppClient', {
      userPoolClientName: `${config.resourcePrefix}-portal-client-${config.stage}`,
      authFlows: {
        userPassword: true, // USER_PASSWORD_AUTH flow
        userSrp: true,
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.minutes(config.stage === 'prod' ? 15 : 60),
      idTokenValidity: cdk.Duration.minutes(config.stage === 'prod' ? 15 : 60),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true, // Ensures generic error messages
    });

    // ─── Customer Group ────────────────────────────────────────────
    this.customerGroup = new cognito.CfnUserPoolGroup(this, 'CustomerGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Customer',
      description: 'Authenticated policyholders accessing the Customer Portal',
    });

    // Additional operational groups
    new cognito.CfnUserPoolGroup(this, 'AdjusterGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Human_Adjuster',
      description: 'Human adjusters reviewing complex claims',
    });

    new cognito.CfnUserPoolGroup(this, 'FraudAnalystGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Fraud_Analyst',
      description: 'Fraud analysts reviewing flagged claims',
    });

    new cognito.CfnUserPoolGroup(this, 'ComplianceOfficerGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'ComplianceOfficer',
      description: 'Compliance officers querying audit logs',
    });
  }
}
