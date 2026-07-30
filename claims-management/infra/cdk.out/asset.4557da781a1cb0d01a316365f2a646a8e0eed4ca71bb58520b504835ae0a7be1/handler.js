"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
/**
 * Lambda handler entry point for the Fraud Detection Service.
 *
 * Invoked by Step Functions during the Fraud_Check stage. Evaluates
 * claim frequency, timeline discrepancy, and watchlist screening.
 */
const claimFrequency_1 = require("./checks/claimFrequency");
const timelineDiscrepancy_1 = require("./checks/timelineDiscrepancy");
const fraudFlagAggregation_1 = require("./checks/fraudFlagAggregation");
const mockWatchlistScreeningClient_1 = require("./screening/mockWatchlistScreeningClient");
const shared_1 = require("@claims/shared");
const watchlistClient = new mockWatchlistScreeningClient_1.MockWatchlistScreeningClient();
async function handler(event) {
    const claimId = event.claimId || 'unknown';
    const config = shared_1.DEFAULT_SYSTEM_CONFIG;
    try {
        const indicators = [];
        // 1. Claim frequency check
        const frequencyQuery = {
            countClaimsWithinWindow: () => event.priorClaimCount || 1,
        };
        const frequencyResult = await (0, claimFrequency_1.checkClaimFrequency)(event.policyNumber || 'POL-UNKNOWN', frequencyQuery, config);
        if (frequencyResult)
            indicators.push(frequencyResult);
        // 2. Timeline discrepancy check
        if (event.incidentDate && event.claimCreatedDate) {
            const timelineData = {
                incidentDate: event.incidentDate,
                claimCreatedDate: event.claimCreatedDate,
                policyStartDate: event.policyStartDate,
                earliestEvidenceDate: event.earliestEvidenceDate,
            };
            const timelineResult = (0, timelineDiscrepancy_1.checkTimelineDiscrepancy)(timelineData);
            if (timelineResult)
                indicators.push(timelineResult);
        }
        // 3. Watchlist screening
        if (event.customerName && event.dateOfBirth) {
            const screeningResult = await watchlistClient.screenCustomer({
                fullName: event.customerName,
                dateOfBirth: event.dateOfBirth,
            });
            if (screeningResult.matchFound) {
                indicators.push({
                    type: 'WatchlistMatch',
                    confidenceScore: screeningResult.confidenceScore,
                    detectedAt: new Date().toISOString(),
                });
            }
        }
        // 4. Aggregate indicators
        const result = (0, fraudFlagAggregation_1.aggregateFraudIndicators)(indicators);
        return {
            claimId,
            fraudFlagged: result.fraudFlagged,
            indicators: result.indicators,
        };
    }
    catch (error) {
        return {
            claimId,
            fraudFlagged: false,
            indicators: [],
            error: error.message,
        };
    }
}
//# sourceMappingURL=handler.js.map