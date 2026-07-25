import {
  DEFAULT_MATCH_CONFIDENCE_SCORE,
  DEFAULT_NO_MATCH_CONFIDENCE_SCORE,
  MockWatchlistScreeningClient,
} from './mockWatchlistScreeningClient';
import type { WatchlistScreeningClient } from './watchlistScreeningClient';

describe('MockWatchlistScreeningClient', () => {
  it('returns a match with matched list(s) and a confidence score for a known-flagged identity', async () => {
    const client = new MockWatchlistScreeningClient([
      {
        fullName: 'Jane Doe',
        dateOfBirth: '1980-01-15',
        matchedLists: ['OFAC-SDN', 'EU-Consolidated'],
        confidenceScore: 0.92,
      },
    ]);

    const result = await client.screenCustomer({
      fullName: 'Jane Doe',
      dateOfBirth: '1980-01-15',
    });

    expect(result.matchFound).toBe(true);
    expect(result.matchedLists).toEqual(['OFAC-SDN', 'EU-Consolidated']);
    expect(result.confidenceScore).toBe(0.92);
  });

  it('matches a flagged identity regardless of name casing/whitespace', async () => {
    const client = new MockWatchlistScreeningClient([
      {
        fullName: 'Jane Doe',
        dateOfBirth: '1980-01-15',
        matchedLists: [],
        confidenceScore: DEFAULT_MATCH_CONFIDENCE_SCORE,
      },
    ]);

    const result = await client.screenCustomer({
      fullName: '  JANE doe  ',
      dateOfBirth: '1980-01-15',
    });

    expect(result.matchFound).toBe(true);
    expect(result.matchedLists).toEqual(['OFAC-SDN']);
  });

  it('returns no match with an empty matched-lists array for an unflagged identity', async () => {
    const client = new MockWatchlistScreeningClient([
      {
        fullName: 'Jane Doe',
        dateOfBirth: '1980-01-15',
        matchedLists: ['OFAC-SDN'],
        confidenceScore: DEFAULT_MATCH_CONFIDENCE_SCORE,
      },
    ]);

    const result = await client.screenCustomer({
      fullName: 'John Smith',
      dateOfBirth: '1975-06-30',
    });

    expect(result.matchFound).toBe(false);
    expect(result.matchedLists).toEqual([]);
    expect(result.confidenceScore).toBe(DEFAULT_NO_MATCH_CONFIDENCE_SCORE);
  });

  it('returns no match by default when no flagged identities are configured', async () => {
    const client = new MockWatchlistScreeningClient();

    const result = await client.screenCustomer({
      fullName: 'Anyone At All',
      dateOfBirth: '1990-01-01',
    });

    expect(result.matchFound).toBe(false);
  });

  it('reflects identities added after construction via addFlaggedIdentity', async () => {
    const client = new MockWatchlistScreeningClient();

    const before = await client.screenCustomer({
      fullName: 'Late Add',
      dateOfBirth: '1990-01-01',
    });
    expect(before.matchFound).toBe(false);

    client.addFlaggedIdentity({
      fullName: 'Late Add',
      dateOfBirth: '1990-01-01',
      matchedLists: ['UN-Sanctions'],
      confidenceScore: 0.88,
    });

    const after = await client.screenCustomer({
      fullName: 'Late Add',
      dateOfBirth: '1990-01-01',
    });
    expect(after.matchFound).toBe(true);
    expect(after.matchedLists).toEqual(['UN-Sanctions']);
    expect(after.confidenceScore).toBe(0.88);
  });

  it('is usable via dependency injection through the WatchlistScreeningClient interface', async () => {
    // Code that depends only on the interface (as aggregation logic in
    // task 10.6 will) must work correctly when given the mock.
    async function isCustomerFlagged(
      client: WatchlistScreeningClient,
      fullName: string,
      dateOfBirth: string,
    ): Promise<boolean> {
      const result = await client.screenCustomer({ fullName, dateOfBirth });
      return result.matchFound;
    }

    const client: WatchlistScreeningClient = new MockWatchlistScreeningClient([
      { fullName: 'Flagged Person', dateOfBirth: '1970-02-02', matchedLists: [], confidenceScore: 0.9 },
    ]);

    await expect(isCustomerFlagged(client, 'Flagged Person', '1970-02-02')).resolves.toBe(true);
    await expect(isCustomerFlagged(client, 'Unflagged Person', '1970-02-02')).resolves.toBe(false);
  });
});
