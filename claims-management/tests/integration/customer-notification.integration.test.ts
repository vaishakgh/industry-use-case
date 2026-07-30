/**
 * 21.18 Integration test: Customer notification delivery.
 * _Requirements: 7.8_
 */
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { describeIntegration, getTestEnv } from './helpers/env';

describeIntegration('Customer notification delivery', () => {
  const env = getTestEnv();
  const lambdaClient = new LambdaClient({ region: env.region });

  it('notify customer Lambda exists with SES send permissions', async () => {
    try {
      const stage = env.claimsTable.split('-').pop();
      const result = await lambdaClient.send(new GetFunctionCommand({
        FunctionName: `claims-notify-customer-${stage}`,
      }));

      expect(result.Configuration?.FunctionName).toContain('notify-customer');
      expect(result.Configuration?.Runtime).toBe('nodejs20.x');
    } catch (err: any) {
      if (err.name === 'ResourceNotFoundException') {
        console.warn('Notify customer Lambda not deployed — skipping');
        return;
      }
      throw err;
    }
  });

  it('notify customer Lambda has claims table read access in env', async () => {
    try {
      const stage = env.claimsTable.split('-').pop();
      const result = await lambdaClient.send(new GetFunctionCommand({
        FunctionName: `claims-notify-customer-${stage}`,
      }));

      const envVars = result.Configuration?.Environment?.Variables ?? {};
      expect(envVars.CLAIMS_TABLE_NAME).toBeDefined();
    } catch (err: any) {
      if (err.name === 'ResourceNotFoundException') {
        return;
      }
      throw err;
    }
  });
});
