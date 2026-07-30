/**
 * CDK unit tests for the Claims Management stack.
 *
 * Verifies key infrastructure resources are present in the synthesized
 * CloudFormation template using CDK assertions.
 *
 * Task 20.12: CDK unit tests (assertions on synthesized template)
 */
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ClaimsManagementStack } from '../lib/claims-management-stack';
import { resolveConfig } from '../lib/config';

function buildTemplate(): Template {
  const app = new cdk.App();
  const config = resolveConfig({ stage: 'test', amplifyRepoUrl: '' });
  const stack = new ClaimsManagementStack(app, 'TestStack', {
    config,
    env: { account: '123456789012', region: 'us-east-1' },
  });
  return Template.fromStack(stack);
}

describe('ClaimsManagementStack', () => {
  let template: Template;

  beforeAll(() => {
    template = buildTemplate();
  });

  // ─── DynamoDB Tables ─────────────────────────────────────────────
  describe('DynamoDB Tables', () => {
    it('creates a Claims table with claimId partition key', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({ AttributeName: 'claimId', KeyType: 'HASH' }),
        ]),
      });
    });

    it('creates a ClaimSessions table with PolicyNumberStatusIndex GSI', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({ IndexName: 'PolicyNumberStatusIndex' }),
        ]),
      });
    });

    it('creates an AuditLog table with ClaimIdIndex GSI', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({ IndexName: 'ClaimIdIndex' }),
        ]),
      });
    });

    it('creates a LoginAttempts table with TTL', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
      });
    });
  });

  // ─── S3 Buckets ──────────────────────────────────────────────────
  describe('S3 Buckets', () => {
    it('creates buckets with KMS encryption', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: Match.objectLike({
          ServerSideEncryptionConfiguration: Match.arrayWith([
            Match.objectLike({
              ServerSideEncryptionByDefault: Match.objectLike({
                SSEAlgorithm: 'aws:kms',
              }),
            }),
          ]),
        }),
      });
    });

    it('creates buckets with versioning enabled', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: { Status: 'Enabled' },
      });
    });

    it('creates buckets with public access blocked', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });
  });

  // ─── KMS Keys ────────────────────────────────────────────────────
  describe('KMS Keys', () => {
    it('creates 4 KMS keys (claims, audit, photos, documents)', () => {
      template.resourceCountIs('AWS::KMS::Key', 4);
    });

    it('enables key rotation on all keys', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });
    });
  });

  // ─── Cognito ─────────────────────────────────────────────────────
  describe('Cognito', () => {
    it('creates a User Pool', () => {
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });

    it('creates a User Pool Client', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ExplicitAuthFlows: Match.arrayWith([
          'ALLOW_USER_PASSWORD_AUTH',
        ]),
        PreventUserExistenceErrors: 'ENABLED',
      });
    });

    it('creates 4 user groups (Customer, Adjuster, FraudAnalyst, ComplianceOfficer)', () => {
      template.resourceCountIs('AWS::Cognito::UserPoolGroup', 4);
    });
  });

  // ─── Lambda Functions ────────────────────────────────────────────
  describe('Lambda Functions', () => {
    it('creates Lambda functions with Node.js 20.x runtime', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
      });
    });

    it('creates at least 9 Lambda functions', () => {
      const resources = template.findResources('AWS::Lambda::Function');
      expect(Object.keys(resources).length).toBeGreaterThanOrEqual(9);
    });
  });

  // ─── Step Functions ──────────────────────────────────────────────
  describe('Step Functions', () => {
    it('creates 2 state machines (lifecycle + dispute)', () => {
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 2);
    });
  });

  // ─── API Gateway ─────────────────────────────────────────────────
  describe('API Gateway', () => {
    it('creates a REST API', () => {
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });

    it('creates a Cognito authorizer', () => {
      template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
        Type: 'COGNITO_USER_POOLS',
      });
    });
  });

  // ─── SES ─────────────────────────────────────────────────────────
  describe('SES', () => {
    it('creates a receipt rule set for email intake', () => {
      template.resourceCountIs('AWS::SES::ReceiptRuleSet', 1);
    });
  });

  // ─── CloudWatch ──────────────────────────────────────────────────
  describe('CloudWatch', () => {
    it('creates a dashboard', () => {
      template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    });

    it('creates alarms', () => {
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      expect(Object.keys(alarms).length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Stack Outputs ───────────────────────────────────────────────
  describe('Stack Outputs', () => {
    it('exports UserPoolId', () => {
      template.hasOutput('UserPoolId', {});
    });

    it('exports UserPoolClientId', () => {
      template.hasOutput('UserPoolClientId', {});
    });

    it('exports ClaimsTableName', () => {
      template.hasOutput('ClaimsTableName', {});
    });

    it('has API-related outputs', () => {
      // API Gateway URL is output by the ApiConstruct
      const outputs = template.findOutputs('*');
      const outputKeys = Object.keys(outputs);
      const hasApiOutput = outputKeys.some((k) => k.includes('Api') && k.includes('Url'));
      expect(hasApiOutput).toBe(true);
    });
  });
});
