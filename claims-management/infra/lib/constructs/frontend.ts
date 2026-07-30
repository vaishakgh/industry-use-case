import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import { Construct } from 'constructs';
import { ClaimsManagementConfig } from '../config';

/**
 * Amplify Hosting for the Customer Portal React SPA.
 *
 * Configures git-branch-based CI/CD deployment.
 * Only created if amplifyRepoUrl is configured.
 *
 * _Requirements: (deployment)_
 */
export interface FrontendConstructProps {
  config: ClaimsManagementConfig;
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
}

export class FrontendConstruct extends Construct {
  public readonly amplifyApp?: amplify.CfnApp;

  constructor(scope: Construct, id: string, props: FrontendConstructProps) {
    super(scope, id);

    const { config } = props;

    // Skip Amplify setup if no repo URL configured
    if (!config.amplifyRepoUrl) {
      return;
    }

    this.amplifyApp = new amplify.CfnApp(this, 'PortalAmplifyApp', {
      name: `${config.resourcePrefix}-portal-${config.stage}`,
      repository: config.amplifyRepoUrl,
      platform: 'WEB_COMPUTE',
      environmentVariables: [
        { name: 'VITE_API_URL', value: props.apiUrl },
        { name: 'VITE_USER_POOL_ID', value: props.userPoolId },
        { name: 'VITE_USER_POOL_CLIENT_ID', value: props.userPoolClientId },
        { name: 'VITE_REGION', value: config.region },
      ],
      buildSpec: cdk.Fn.base64(JSON.stringify({
        version: 1,
        frontend: {
          phases: {
            preBuild: { commands: ['cd frontend', 'npm ci'] },
            build: { commands: ['npm run build'] },
          },
          artifacts: {
            baseDirectory: 'frontend/dist',
            files: ['**/*'],
          },
          cache: { paths: ['frontend/node_modules/**/*'] },
        },
      })),
    });

    // Branch auto-deployment
    new amplify.CfnBranch(this, 'MainBranch', {
      appId: this.amplifyApp.attrAppId,
      branchName: config.amplifyBranch,
      enableAutoBuild: true,
      stage: config.stage === 'prod' ? 'PRODUCTION' : 'DEVELOPMENT',
    });
  }
}
