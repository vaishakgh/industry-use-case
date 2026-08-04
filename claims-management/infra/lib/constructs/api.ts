import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * API Gateway (REST API) for the Customer Portal.
 *
 * Routes:
 * - POST /auth/login (no authorizer — public)
 * - GET /claims (Cognito authorizer)
 * - GET /claims/{id} (Cognito authorizer)
 * - POST /claims/{id}/documents (Cognito authorizer)
 * - POST /claims/{id}/disputes (Cognito authorizer)
 *
 * _Requirements: 9.1, 10.1, 10.2, 11.1_
 */
export interface ApiConstructProps {
  config: ClaimsManagementConfig;
  portalApiFn: lambda.IFunction;
  userPool: cognito.IUserPool;
}

export class ApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { config } = props;

    // ─── REST API ──────────────────────────────────────────────────
    this.api = new apigateway.RestApi(this, 'PortalApi', {
      restApiName: `${config.resourcePrefix}-portal-api-${config.stage}`,
      description: 'Customer Portal API for Claims Management system',
      deployOptions: {
        stageName: config.stage,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
      },
    });

    // ─── Cognito Authorizer ────────────────────────────────────────
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: `${config.resourcePrefix}-cognito-authorizer`,
      identitySource: 'method.request.header.Authorization',
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(props.portalApiFn);

    // ─── Routes ────────────────────────────────────────────────────

    // POST /auth/login — public (no authorizer)
    const authResource = this.api.root.addResource('auth');
    authResource.addResource('login').addMethod('POST', lambdaIntegration);

    // GET /claims — authenticated
    const claimsResource = this.api.root.addResource('claims');
    claimsResource.addMethod('GET', lambdaIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /claims/{id} — authenticated
    const claimByIdResource = claimsResource.addResource('{id}');
    claimByIdResource.addMethod('GET', lambdaIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /claims/{id}/documents — authenticated
    claimByIdResource.addResource('documents').addMethod('POST', lambdaIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /claims/{id}/disputes — authenticated
    claimByIdResource.addResource('disputes').addMethod('POST', lambdaIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /claims/report — authenticated (Report New Claim)
    claimsResource.addResource('report').addMethod('POST', lambdaIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ─── Outputs ───────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Customer Portal API URL',
    });
  }
}
