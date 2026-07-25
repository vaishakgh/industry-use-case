import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type { Claim } from '@claims/shared';
import { DynamoDbClaimsRepository } from './claimsRepository';
import { ClaimIdAllocationExhaustedError, createClaimWithUniqueId, type ClaimData } from './createClaim';

function buildClaimData(): ClaimData {
  return {
    policyNumber: 'POL-1',
    claimStatus: 'Intake',
    structuredFields: {
      policyNumber: { value: null, confidenceScore: null, confirmed: false },
      incidentDate: { value: null, confidenceScore: null, confirmed: false },
      incidentLocation: { value: null, confidenceScore: null, confirmed: false },
      damageDescription: { value: null, confidenceScore: null, confirmed: false },
    },
    originalChannel: 'Chat',
    photoRefs: [],
    documentRefs: [],
    severityRating: null,
    estimatedRepairCost: null,
    damageAssessmentConfidence: null,
    photoResubmissionCount: 0,
    fraudFlag: false,
    fraudIndicators: [],
    statusHistory: [],
    adjusterId: null,
    fraudAnalystId: null,
    dispute: null,
    policyholderIds: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

const conditionalCheckFailure = Object.assign(new Error('The conditional request failed'), {
  name: 'ConditionalCheckFailedException',
});

describe('createClaimWithUniqueId', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  it('creates the claim on the first attempt when no collision occurs', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);
    const claimData = buildClaimData();

    const claim: Claim = await createClaimWithUniqueId(claimData, repository);

    expect(claim.claimId).toHaveLength(26);
    expect(claim).toMatchObject(claimData);
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
  });

  it('retries with a freshly generated Claim_ID and succeeds after one simulated collision', async () => {
    ddbMock.on(PutCommand).rejectsOnce(conditionalCheckFailure).resolves({});
    const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);
    const claimData = buildClaimData();

    const claim = await createClaimWithUniqueId(claimData, repository);

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(2);
    const firstAttemptedId = calls[0]?.args[0].input.Item?.claimId;
    const secondAttemptedId = calls[1]?.args[0].input.Item?.claimId;
    expect(firstAttemptedId).not.toEqual(secondAttemptedId);
    expect(claim.claimId).toEqual(secondAttemptedId);
  });

  it('throws ClaimIdAllocationExhaustedError after repeated simulated collisions exhaust the retry budget', async () => {
    ddbMock.on(PutCommand).rejects(conditionalCheckFailure);
    const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);
    const claimData = buildClaimData();

    await expect(createClaimWithUniqueId(claimData, repository, 3)).rejects.toBeInstanceOf(
      ClaimIdAllocationExhaustedError,
    );
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3);
  });

  it('propagates a non-collision repository failure immediately without retrying', async () => {
    const throttlingError = Object.assign(new Error('Rate exceeded'), {
      name: 'ProvisionedThroughputExceededException',
    });
    ddbMock.on(PutCommand).rejects(throttlingError);
    const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

    await expect(createClaimWithUniqueId(buildClaimData(), repository)).rejects.toMatchObject({
      name: 'ClaimsAccessError',
    });
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
  });
});
