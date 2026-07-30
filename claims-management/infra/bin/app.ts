#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClaimsManagementStack } from '../lib/claims-management-stack';
import { resolveConfig } from '../lib/config';

const app = new cdk.App();

const config = resolveConfig({
  stage: app.node.tryGetContext('stage') ?? 'dev',
});

new ClaimsManagementStack(app, `${config.resourcePrefix}-${config.stage}`, {
  env: {
    account: config.accountId || undefined,
    region: config.region,
  },
  config,
});
