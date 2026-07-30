/**
 * 21.14 Integration test: Step Functions dispute resolution workflow.
 * _Requirements: 11.1, 11.3, 11.6_
 */
import { SFNClient, DescribeStateMachineCommand, ListStateMachinesCommand } from '@aws-sdk/client-sfn';
import { describeIntegration, getTestEnv } from './helpers/env';

describeIntegration('Step Functions dispute resolution workflow', () => {
  const env = getTestEnv();
  const sfnClient = new SFNClient({ region: env.region });

  it('dispute resolution state machine exists and is ACTIVE', async () => {
    const listResult = await sfnClient.send(new ListStateMachinesCommand({}));
    const disputeSm = listResult.stateMachines?.find((sm) =>
      sm.name?.includes('dispute-resolution'),
    );

    expect(disputeSm).toBeDefined();

    if (disputeSm?.stateMachineArn) {
      const describe = await sfnClient.send(new DescribeStateMachineCommand({
        stateMachineArn: disputeSm.stateMachineArn,
      }));
      expect(describe.status).toBe('ACTIVE');
    }
  });

  it('dispute resolution state machine definition contains expected states', async () => {
    const listResult = await sfnClient.send(new ListStateMachinesCommand({}));
    const disputeSm = listResult.stateMachines?.find((sm) =>
      sm.name?.includes('dispute-resolution'),
    );

    if (disputeSm?.stateMachineArn) {
      const describe = await sfnClient.send(new DescribeStateMachineCommand({
        stateMachineArn: disputeSm.stateMachineArn,
      }));
      const definition = JSON.stringify(JSON.parse(describe.definition ?? '{}'));

      expect(definition).toContain('ValidateDispute');
      expect(definition).toContain('RouteToAdjuster');
    }
  });
});
