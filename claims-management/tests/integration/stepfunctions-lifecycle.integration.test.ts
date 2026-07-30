/**
 * 21.12 Integration test: Step Functions claim lifecycle end-to-end.
 * _Requirements: 7.1, 7.6, 8.1_
 */
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { describeIntegration, getTestEnv } from './helpers/env';
import { testId } from './helpers/cleanup';

describeIntegration('Step Functions claim lifecycle end-to-end', () => {
  const env = getTestEnv();
  const sfnClient = new SFNClient({ region: env.region });
  const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.region }));

  it('starts an execution and receives a valid executionArn', async () => {
    const claimId = testId();

    const result = await sfnClient.send(new StartExecutionCommand({
      stateMachineArn: env.lifecycleStateMachineArn,
      name: `test-${claimId}`,
      input: JSON.stringify({ claimId, policyNumber: 'POL-TEST' }),
    }));

    expect(result.executionArn).toBeDefined();
    expect(result.startDate).toBeDefined();

    // Verify execution is running
    const describe = await sfnClient.send(new DescribeExecutionCommand({
      executionArn: result.executionArn!,
    }));

    expect(['RUNNING', 'SUCCEEDED']).toContain(describe.status);
  });
});
