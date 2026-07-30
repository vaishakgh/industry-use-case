/**
 * Property-based test for fraud flag aggregation from indicators.
 *
 * Property 23: Fraud flag aggregation from indicators
 * A Fraud_Flag is applied if and only if the identified indicator set is
 * non-empty, recording every indicator with its confidence score.
 *
 * _Requirements: 6.4_
 */
import fc from 'fast-check';
import type { FraudIndicatorRecord } from '@claims/shared';
import { aggregateFraudIndicators } from './fraudFlagAggregation';

const fraudIndicatorArbitrary: fc.Arbitrary<FraudIndicatorRecord> = fc.record({
  type: fc.constantFrom('ClaimFrequency', 'TimelineDiscrepancy', 'WatchlistMatch'),
  confidenceScore: fc.double({ min: 0, max: 1, noNaN: true }),
  detectedAt: fc.constant('2024-06-01T00:00:00.000Z'),
});

describe('aggregateFraudIndicators property tests', () => {
  // Feature: claims-management-fnol, Property 23: Fraud flag aggregation from indicators
  it('flags iff indicator set is non-empty, and preserves all indicators', () => {
    fc.assert(
      fc.property(
        fc.array(fraudIndicatorArbitrary, { minLength: 0, maxLength: 10 }),
        (indicators) => {
          const result = aggregateFraudIndicators(indicators);

          if (indicators.length > 0) {
            // Non-empty → must flag
            expect(result.fraudFlagged).toBe(true);
            expect(result.indicators).toHaveLength(indicators.length);
            // Every indicator is preserved
            expect(result.indicators).toEqual(indicators);
          } else {
            // Empty → must NOT flag
            expect(result.fraudFlagged).toBe(false);
            expect(result.indicators).toHaveLength(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('never flags when no indicators are provided', () => {
    const result = aggregateFraudIndicators([]);
    expect(result.fraudFlagged).toBe(false);
    expect(result.indicators).toEqual([]);
  });

  it('always flags when at least one indicator is provided', () => {
    fc.assert(
      fc.property(
        fc.array(fraudIndicatorArbitrary, { minLength: 1, maxLength: 5 }),
        (indicators) => {
          const result = aggregateFraudIndicators(indicators);
          expect(result.fraudFlagged).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
