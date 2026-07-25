/**
 * Deterministic mock implementation of `WatchlistScreeningClient`.
 *
 * Used in place of a real sanctions/watchlist screening provider for
 * aggregation logic and tests (task 10.6 and its property test), so no real
 * external API is ever called from test/aggregation code. Matches are
 * determined by a static or constructor-supplied list of "flagged"
 * identities, keyed on full name + date of birth (case/whitespace
 * insensitive), so results are deterministic and reproducible.
 */
import type {
  CustomerIdentityAttributes,
  WatchlistScreeningClient,
  WatchlistScreeningResult,
} from './watchlistScreeningClient';

/**
 * A single "flagged" identity entry used by the mock client to decide
 * whether a screened customer matches a watchlist/sanctions list.
 */
export interface FlaggedIdentity {
  fullName: string;
  dateOfBirth: string;
  matchedLists: string[];
  confidenceScore: number;
}

/** Default confidence score used for a match when none is specified. */
export const DEFAULT_MATCH_CONFIDENCE_SCORE = 0.95;

/** Default confidence score used for a "no match" result. */
export const DEFAULT_NO_MATCH_CONFIDENCE_SCORE = 0.99;

/** Default watchlist name used for a match when none is specified. */
const DEFAULT_MATCHED_LIST = 'OFAC-SDN';

function normalizeIdentityKey(fullName: string, dateOfBirth: string): string {
  return `${fullName.trim().toLowerCase()}|${dateOfBirth.trim()}`;
}

/**
 * A deterministic, configurable mock `WatchlistScreeningClient`.
 *
 * By default the client has no flagged identities (every `screenCustomer`
 * call returns no match). Flagged identities can be supplied via the
 * constructor, or added after construction with `addFlaggedIdentity`, to
 * exercise the match path in unit and property-based tests without calling
 * any real external API.
 */
export class MockWatchlistScreeningClient implements WatchlistScreeningClient {
  private readonly flaggedIdentitiesByKey: Map<string, FlaggedIdentity>;

  constructor(flaggedIdentities: FlaggedIdentity[] = []) {
    this.flaggedIdentitiesByKey = new Map(
      flaggedIdentities.map((identity) => [
        normalizeIdentityKey(identity.fullName, identity.dateOfBirth),
        identity,
      ]),
    );
  }

  /** Registers an additional identity that SHALL produce a match. */
  addFlaggedIdentity(identity: FlaggedIdentity): void {
    this.flaggedIdentitiesByKey.set(
      normalizeIdentityKey(identity.fullName, identity.dateOfBirth),
      identity,
    );
  }

  async screenCustomer(
    identityAttributes: CustomerIdentityAttributes,
  ): Promise<WatchlistScreeningResult> {
    const key = normalizeIdentityKey(
      identityAttributes.fullName,
      identityAttributes.dateOfBirth,
    );
    const flagged = this.flaggedIdentitiesByKey.get(key);

    if (flagged) {
      return {
        matchFound: true,
        matchedLists: flagged.matchedLists.length > 0 ? flagged.matchedLists : [DEFAULT_MATCHED_LIST],
        confidenceScore: flagged.confidenceScore ?? DEFAULT_MATCH_CONFIDENCE_SCORE,
      };
    }

    return {
      matchFound: false,
      matchedLists: [],
      confidenceScore: DEFAULT_NO_MATCH_CONFIDENCE_SCORE,
    };
  }
}
