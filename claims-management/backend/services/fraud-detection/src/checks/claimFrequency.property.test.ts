/**
 * Property-based test for claim frequency fraud indicator threshold.
 *
 * Property 21: Claim frequency fraud indicator threshold
 * The claim-frequency check identifies a Fraud_Indicator if and only if the
 * number of claims within the configured window strictly exceeds the
 * configured threshold.
 *
 * _Requirements: 6.1_
 */
import fc from 'fast-check';
import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from '@claims/shared';
import { checkClaimFrequency, type ClaimHistoryQuery } from './claimFrequency';

describe('checkClaimFrequency property tests', () => {
  // Feature: claims-management-fnol, Property 21: Claim frequency fraud indicator threshold
  it('returns a fraud indicator iff the claim count strictly exceeds the threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),  // threshold
        fc.integer({ min: 0, max: 30 }),  // count
        fc.integer({ min: 1, max: 365 }), // window days
        async (threshold, count, windowDays) => {
          const config: SystemConfig = {
            ...DEFAULT_SYSTEM_CONFIG,
            fraudFrequencyThreshold: threshold,
            fraudFrequencyWindowDays: windowDays,
          };

          const query: ClaimHistoryQuery = {
            countClaimsWithinWindow: () => count,
          };

          const asOf = new Date('2024-06-01T00:00:00.000Z');
          const result = await checkClaimFrequency('POLICY-TEST', query, config, asOf);

          if (count > threshold) {
            // Indicator MUST be produced
            expect(result).not.toBeNull();
            expect(result?.type).toBe('ClaimFrequency');
            expect(result?.confidenceScore).toBeGreaterThan(0);
            expect(result?.confidenceScore).toBeLessThanOrEqual(1);
          } else {
            // Indicator MUST NOT be produced
            expect(result).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
