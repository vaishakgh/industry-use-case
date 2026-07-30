"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockWatchlistScreeningClient = exports.DEFAULT_NO_MATCH_CONFIDENCE_SCORE = exports.DEFAULT_MATCH_CONFIDENCE_SCORE = void 0;
/** Default confidence score used for a match when none is specified. */
exports.DEFAULT_MATCH_CONFIDENCE_SCORE = 0.95;
/** Default confidence score used for a "no match" result. */
exports.DEFAULT_NO_MATCH_CONFIDENCE_SCORE = 0.99;
/** Default watchlist name used for a match when none is specified. */
const DEFAULT_MATCHED_LIST = 'OFAC-SDN';
function normalizeIdentityKey(fullName, dateOfBirth) {
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
class MockWatchlistScreeningClient {
    flaggedIdentitiesByKey;
    constructor(flaggedIdentities = []) {
        this.flaggedIdentitiesByKey = new Map(flaggedIdentities.map((identity) => [
            normalizeIdentityKey(identity.fullName, identity.dateOfBirth),
            identity,
        ]));
    }
    /** Registers an additional identity that SHALL produce a match. */
    addFlaggedIdentity(identity) {
        this.flaggedIdentitiesByKey.set(normalizeIdentityKey(identity.fullName, identity.dateOfBirth), identity);
    }
    async screenCustomer(identityAttributes) {
        const key = normalizeIdentityKey(identityAttributes.fullName, identityAttributes.dateOfBirth);
        const flagged = this.flaggedIdentitiesByKey.get(key);
        if (flagged) {
            return {
                matchFound: true,
                matchedLists: flagged.matchedLists.length > 0 ? flagged.matchedLists : [DEFAULT_MATCHED_LIST],
                confidenceScore: flagged.confidenceScore ?? exports.DEFAULT_MATCH_CONFIDENCE_SCORE,
            };
        }
        return {
            matchFound: false,
            matchedLists: [],
            confidenceScore: exports.DEFAULT_NO_MATCH_CONFIDENCE_SCORE,
        };
    }
}
exports.MockWatchlistScreeningClient = MockWatchlistScreeningClient;
//# sourceMappingURL=mockWatchlistScreeningClient.js.map