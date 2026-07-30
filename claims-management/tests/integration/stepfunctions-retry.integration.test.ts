/**
 * 21.13 Integration test: Step Functions retry and escalation.
 * _Requirements: 7.2, 7.3_
 */
import { SFNClient, DescribeStateMachineCommand } from '@aws-sdk/client-sfn';
import { describeIntegration, getTestEnv } from './helpers/env';

describeIntegration('Step Functions retry and escalation', () => {
  const env = getTestEnv();
  const sfnClient = new SFNClient({ region: env.region });

  it('state machine definition includes retry configuration', async () => {
    const result = await sfnClient.send(new DescribeStateMachineCommand({
      stateMachineArn: env.lifecycleStateMachineArn,
    }));

    const definition = JSON.parse(result.definition ?? '{}');
    const definitionStr = JSON.stringify(definition);

    // Verify retry configuration exists in the state machine
    expect(definitionStr).toContain('Retry');
    expect(definitionStr).toContain('Claims.TransientFailure');
  });

  it('state machine definition includes catch/escalation configuration', async () => {
    const result = await sfnClient.send(new DescribeStateMachineCommand({
      stateMachineArn: env.lifecycleStateMachineArn,
    }));

    const definition = JSON.parse(result.definition ?? '{}');
    const definitionStr = JSON.stringify(definition);

    // Verify catch configuration exists for escalation
    expect(definitionStr).toContain('Catch');
    expect(definitionStr).toContain('Claims.PersistentFailure');
  });
});
