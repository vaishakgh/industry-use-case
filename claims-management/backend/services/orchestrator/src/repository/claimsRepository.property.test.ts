import fc from 'fast-check';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { CLAIM_STATUS_VALUES } from '@claims/shared';
import type { StatusHistoryEntry } from '@claims/shared';
import { DynamoDbClaimsRepository } from './claimsRepository';

/**
 * Arbitrary for a single generated `{status, timestamp}` transition. The
 * timestamp is generated from an arbitrary `Date` and rendered as an
 * ISO-8601 string, matching `ISODateTimeString`'s documented shape.
 */
const transitionArb = fc.record({
  status: fc.constantFrom(...CLAIM_STATUS_VALUES),
  timestamp: fc
    .date({ min: new Date(0), max: new Date(4102444800000), noInvalidDate: true })
    .map((d) => d.toISOString()),
});

describe('DynamoDbClaimsRepository.appendStatusHistory property tests', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  // Feature: claims-management-fnol, Property 28: Status transition history invariant
  it('produces exactly N history entries, in call order, with none lost, reordered, or duplicated', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(transitionArb, { minLength: 0, maxLength: 30 }), async (transitions) => {
        // Simulates DynamoDB's server-side list_append semantics against an
        // in-memory "table", driven entirely by the generated transition
        // sequence, mirroring the existing sequential-appendStatusHistory
        // unit test's mocking approach.
        let history: StatusHistoryEntry[] = [];

        ddbMock.reset();
        ddbMock.on(UpdateCommand).callsFake((input) => {
          const values = input.ExpressionAttributeValues as { ':entry': StatusHistoryEntry[] };
          history = [...history, ...values[':entry']];
          return { Attributes: { claimId: 'claim-1', statusHistory: history } };
        });

        const repository = new DynamoDbClaimsRepository(ddbMock as unknown as DynamoDBDocumentClient);

        for (const transition of transitions) {
          await repository.appendStatusHistory('claim-1', transition.status, transition.timestamp);
        }

        // Exactly one entry per transition (no entries lost or duplicated).
        expect(history).toHaveLength(transitions.length);
        // Same order as the calls were made, with the exact status/timestamp
        // carried through unchanged (no reordering).
        expect(history).toEqual(transitions);
      }),
      { numRuns: 100 },
    );
  });
});
