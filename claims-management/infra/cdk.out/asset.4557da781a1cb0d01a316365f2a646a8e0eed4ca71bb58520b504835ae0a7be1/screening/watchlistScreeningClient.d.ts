/**
 * Watchlist/sanctions screening client abstraction.
 *
 * The Fraud Detection Service's watchlist screening check (Req 6.3) calls an
 * external sanctions/watchlist screening API. That API is abstracted behind
 * the `WatchlistScreeningClient` interface below so the concrete provider
 * can be swapped without changing the aggregation/decision logic that
 * consumes it, and so tests never call a real external API (per the
 * design's mocking-boundary guidance).
 *
 * See design.md: "Fraud Detection Service" -> "Watchlist screening"; task
 * 10.5.
 */
import type { ConfidenceScore } from '@claims/shared';
/**
 * The customer identity attributes submitted for watchlist/sanctions
 * screening.
 */
export interface CustomerIdentityAttributes {
    fullName: string;
    dateOfBirth: string;
    nationality?: string;
    address?: string;
}
/**
 * The result of a single watchlist/sanctions screening call.
 */
export interface WatchlistScreeningResult {
    /** Whether the identity matched any watchlist/sanctions list. */
    matchFound: boolean;
    /** Names of the list(s) matched; empty when `matchFound` is false. */
    matchedLists: string[];
    /**
     * Confidence score in [0, 1] for the screening result. When
     * `matchFound` is false this is the confidence of the "no match"
     * determination.
     */
    confidenceScore: ConfidenceScore;
}
/**
 * Abstraction over an external sanctions/watchlist screening provider.
 * Concrete implementations call the real provider's API; tests and
 * aggregation logic depend only on this interface so the provider can be
 * swapped (e.g. from `MockWatchlistScreeningClient` to a real client) without
 * any change to calling code.
 */
export interface WatchlistScreeningClient {
    screenCustomer(identityAttributes: CustomerIdentityAttributes): Promise<WatchlistScreeningResult>;
}
//# sourceMappingURL=watchlistScreeningClient.d.ts.map