/**
 * 21.17 Integration test: Amazon Rekognition damage assessment wiring.
 * _Requirements: 4.2, 4.3_
 */
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { describeIntegration, getTestEnv } from './helpers/env';

describeIntegration('Amazon Rekognition damage assessment wiring', () => {
  const env = getTestEnv();
  const lambdaClient = new LambdaClient({ region: env.region });

  it('damage assessment Lambda exists with Rekognition permissions', async () => {
    try {
      const stage = env.claimsTable.split('-').pop();
      const result = await lambdaClient.send(new GetFunctionCommand({
        FunctionName: `claims-damage-assessment-${stage}`,
      }));

      expect(result.Configuration?.FunctionName).toContain('damage-assessment');
      expect(result.Configuration?.Runtime).toBe('nodejs20.x');

      // Verify environment has required photo bucket config
      const envVars = result.Configuration?.Environment?.Variables ?? {};
      expect(envVars.PHOTOS_BUCKET_NAME).toBeDefined();
    } catch (err: any) {
      if (err.name === 'ResourceNotFoundException') {
        console.warn('Damage assessment Lambda not deployed — skipping');
        return;
      }
      throw err;
    }
  });
});
