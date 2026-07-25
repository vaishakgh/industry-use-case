import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type { Claim } from '@claims/shared';
import { CLAIMS_TABLE_NAME, ClaimIdCollisionError, ClaimsAccessError, DynamoDbClaimsRepository } from './claimsRepository';

function buildClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    claimId: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
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
    ...overrides,
  };
}

describe('DynamoDbClaimsRepository', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  describe('putClaimIfNotExists', () => {
    it('successfully creates a claim via a conditional PutItem', async () => {
      ddbMock.on(PutCommand).resolves({});
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);
      const claim = buildClaim();

      await expect(repository.putClaimIfNotExists(claim)).resolves.toBeUndefined();

      expect(ddbMock.calls()).toHaveLength(1);
      const call = ddbMock.call(0);
      expect(call.args[0].input).toEqual({
        TableName: CLAIMS_TABLE_NAME,
        Item: claim,
        ConditionExpression: 'attribute_not_exists(claimId)',
      });
    });

    it('throws ClaimIdCollisionError on a duplicate-key conditional failure', async () => {
      const conditionalError = Object.assign(new Error('The conditional request failed'), {
        name: 'ConditionalCheckFailedException',
      });
      ddbMock.on(PutCommand).rejects(conditionalError);
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);
      const claim = buildClaim();

      await expect(repository.putClaimIfNotExists(claim)).rejects.toBeInstanceOf(ClaimIdCollisionError);
      await expect(repository.putClaimIfNotExists(claim)).rejects.toMatchObject({ claimId: claim.claimId });
    });

    it('throws ClaimsAccessError (not ClaimIdCollisionError) on a genuine write failure', async () => {
      const throttlingError = Object.assign(new Error('Rate exceeded'), {
        name: 'ProvisionedThroughputExceededException',
      });
      ddbMock.on(PutCommand).rejects(throttlingError);
      const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await expect(repository.putClaimIfNotExists(buildClaim())).rejects.toBeInstanceOf(ClaimsAccessError);
      await expect(repository.putClaimIfNotExists(buildClaim())).rejects.not.toBeInstanceOf(ClaimIdCollisionError);
    });
  });
});
