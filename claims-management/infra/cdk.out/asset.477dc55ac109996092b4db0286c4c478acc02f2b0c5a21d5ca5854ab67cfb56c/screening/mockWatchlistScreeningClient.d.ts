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
import type { CustomerIdentityAttributes, WatchlistScreeningClient, WatchlistScreeningResult } from './watchlistScreeningClient';
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
export declare const DEFAULT_MATCH_CONFIDENCE_SCORE = 0.95;
/** Default confidence score used for a "no match" result. */
export declare const DEFAULT_NO_MATCH_CONFIDENCE_SCORE = 0.99;
/**
 * A deterministic, configurable mock `WatchlistScreeningClient`.
 *
 * By default the client has no flagged identities (every `screenCustomer`
 * call returns no match). Flagged identities can be supplied via the
 * constructor, or added after construction with `addFlaggedIdentity`, to
 * exercise the match path in unit and property-based tests without calling
 * any real external API.
 */
export declare class MockWatchlistScreeningClient implements WatchlistScreeningClient {
    private readonly flaggedIdentitiesByKey;
    constructor(flaggedIdentities?: FlaggedIdentity[]);
    /** Registers an additional identity that SHALL produce a match. */
    addFlaggedIdentity(identity: FlaggedIdentity): void;
    screenCustomer(identityAttributes: CustomerIdentityAttributes): Promise<WatchlistScreeningResult>;
}
//# sourceMappingURL=mockWatchlistScreeningClient.d.ts.map