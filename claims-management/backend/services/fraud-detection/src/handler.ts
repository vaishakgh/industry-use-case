/**
 * Lambda handler entry point for the Fraud Detection Service.
 *
 * Invoked by Step Functions during the Fraud_Check stage. Evaluates
 * claim frequency, timeline discrepancy, and watchlist screening.
 */
import { checkClaimFrequency, type ClaimHistoryQuery } from './checks/claimFrequency';
import { checkTimelineDiscrepancy, type ClaimTimelineData } from './checks/timelineDiscrepancy';
import { aggregateFraudIndicators } from './checks/fraudFlagAggregation';
import { MockWatchlistScreeningClient } from './screening/mockWatchlistScreeningClient';
import { DEFAULT_SYSTEM_CONFIG, type FraudIndicatorRecord } from '@claims/shared';

const watchlistClient = new MockWatchlistScreeningClient();

export async function handler(event: any): Promise<any> {
  const claimId = event.claimId || 'unknown';
  const config = DEFAULT_SYSTEM_CONFIG;

  try {
    const indicators: FraudIndicatorRecord[] = [];

    // 1. Claim frequency check
    const frequencyQuery: ClaimHistoryQuery = {
      countClaimsWithinWindow: () => event.priorClaimCount || 1,
    };
    const frequencyResult = await checkClaimFrequency(
      event.policyNumber || 'POL-UNKNOWN',
      frequencyQuery,
      config,
    );
    if (frequencyResult) indicators.push(frequencyResult);

    // 2. Timeline discrepancy check
    if (event.incidentDate && event.claimCreatedDate) {
      const timelineData: ClaimTimelineData = {
        incidentDate: event.incidentDate,
        claimCreatedDate: event.claimCreatedDate,
        policyStartDate: event.policyStartDate,
        earliestEvidenceDate: event.earliestEvidenceDate,
      };
      const timelineResult = checkTimelineDiscrepancy(timelineData);
      if (timelineResult) indicators.push(timelineResult);
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
    const result = aggregateFraudIndicators(indicators);

    return {
      claimId,
      fraudFlagged: result.fraudFlagged,
      indicators: result.indicators,
    };
  } catch (error: any) {
    return {
      claimId,
      fraudFlagged: false,
      indicators: [],
      error: error.message,
    };
  }
}
