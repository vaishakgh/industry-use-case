/**
 * Property-based test for chronological per-claim audit retrieval.
 *
 * See design.md: Property 31: Chronological per-claim audit retrieval.
 *
 * _Requirements: 8.4_
 */
import fc from 'fast-check';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type { AuditLogRecord } from '@claims/shared';
import { DynamoDbAuditLogRepository } from './auditLogRepository';

/**
 * Builds a distinct, chronologically-sortable `AuditLogRecord` for the
 * given index. `logId` is a zero-padded, lexicographically-sortable string
 * (mirroring how a real ULID sorts by creation time) and `timestamp`
 * increases monotonically with `index`, so index order == chronological
 * order for every generated record set.
 */
function buildRecord(claimId: string, index: number, timestamp: string): AuditLogRecord {
  return {
    logId: `LOG-${String(index).padStart(6, '0')}`,
    claimId,
    decisionType: 'FieldExtraction',
    inputs: {},
    confidenceScore: null,
    fraudIndicators: null,
    timestamp,
    actorType: 'System',
    actorId: null,
  };
}

/**
 * Arbitrary for a set of `AuditLogRecord`s all belonging to the same
 * `claimId`, with distinct, strictly increasing timestamps (so there is a
 * single well-defined chronological order), paired with a random
 * permutation describing the order in which they are "inserted" into the
 * mocked DynamoDB client -- i.e., an order that need not match chronological
 * order.
 */
const claimAuditRecordsArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.uniqueArray(fc.date({ noInvalidDate: true }), {
      minLength: 0,
      maxLength: 25,
      selector: (date) => date.getTime(),
    }),
  )
  .chain(([claimId, dates]) => {
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const chronological = sortedDates.map((date, index) => buildRecord(claimId, index, date.toISOString()));
    return fc.tuple(fc.constant(claimId), fc.constant(chronological), fc.shuffledSubarray(chronological, {
      minLength: chronological.length,
      maxLength: chronological.length,
    }));
  })
  .map(([claimId, chronological, insertionOrder]) => ({ claimId, chronological, insertionOrder }));

describe('DynamoDbAuditLogRepository.queryAuditLogByClaimId property tests', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  // Feature: claims-management-fnol, Property 31: Chronological per-claim audit retrieval
  it('always returns records for a claim sorted chronologically (oldest first), regardless of insertion order', async () => {
    await fc.assert(
      fc.asyncProperty(claimAuditRecordsArb, async ({ claimId, chronological, insertionOrder }) => {
        // The mocked DynamoDB client's `Items` reflects whatever order the
        // records were "inserted" in (i.e. table storage order), NOT
        // necessarily chronological order. `queryAuditLogByClaimId` issues
        // a `ScanIndexForward: true` query on the `logId` GSI sort key, so
        // it is the repository's responsibility to have DynamoDB return
        // (and thus for the fake to simulate returning) ascending logId
        // order regardless of how items were stored.
        ddbMock.reset();
        ddbMock.on(QueryCommand).callsFake((input) => {
          expect(input.ScanIndexForward).toBe(true);
          // Simulate what a real GSI ascending-logId query would return:
          // storage/insertion order does not matter, only sort-key order.
          const sorted = [...insertionOrder].sort((a, b) => (a.logId < b.logId ? -1 : a.logId > b.logId ? 1 : 0));
          return { Items: sorted };
        });

        const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

        const result = await repository.queryAuditLogByClaimId(claimId);

        // Regardless of the random insertion order, the result must equal
        // the chronological (oldest-first) ordering by timestamp/logId.
        expect(result).toEqual(chronological);

        // Sanity check: the result is actually sorted ascending by
        // timestamp (i.e. the property is checking something non-trivial).
        const timestamps = result.map((record) => new Date(record.timestamp).getTime());
        const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
        expect(timestamps).toEqual(sortedTimestamps);
      }),
      { numRuns: 100 },
    );
  });
});
