import { DEFAULT_SYSTEM_CONFIG, SystemConfig } from '@claims/shared';
import {
  CLAIM_FREQUENCY_INDICATOR_TYPE,
  checkClaimFrequency,
  ClaimHistoryQuery,
} from './claimFrequency';

/** A fake ClaimHistoryQuery that always returns a fixed, injected count. */
class FakeClaimHistoryQuery implements ClaimHistoryQuery {
  constructor(private readonly count: number) {}

  countClaimsWithinWindow(): number {
    return this.count;
  }
}

function configWithThreshold(fraudFrequencyThreshold: number): SystemConfig {
  return {
    ...DEFAULT_SYSTEM_CONFIG,
    fraudFrequencyThreshold,
    fraudFrequencyWindowDays: 90,
  };
}

describe('checkClaimFrequency', () => {
  const asOf = new Date('2024-06-01T00:00:00.000Z');

  it('returns no indicator when the claim count is below the threshold', async () => {
    const config = configWithThreshold(3);
    const query = new FakeClaimHistoryQuery(2);

    const result = await checkClaimFrequency('POLICY-123', query, config, asOf);

    expect(result).toBeNull();
  });

  it('returns no indicator when the claim count is exactly at the threshold (boundary: "exceeds" is strict)', async () => {
    // Requirement 6.1 says a Fraud_Indicator is identified when the count
    // "exceeds" the threshold. A count equal to the threshold has not
    // exceeded it, so this is documented/tested as the inclusive (no
    // indicator) side of the boundary.
    const config = configWithThreshold(3);
    const query = new FakeClaimHistoryQuery(3);

    const result = await checkClaimFrequency('POLICY-123', query, config, asOf);

    expect(result).toBeNull();
  });

  it('returns a frequency indicator with a confidence score when the count exceeds the threshold', async () => {
    const config = configWithThreshold(3);
    const query = new FakeClaimHistoryQuery(4);

    const result = await checkClaimFrequency('POLICY-123', query, config, asOf);

    expect(result).not.toBeNull();
    expect(result?.type).toBe(CLAIM_FREQUENCY_INDICATOR_TYPE);
    expect(result?.detectedAt).toBe(asOf.toISOString());
    expect(result?.confidenceScore).toBeGreaterThan(0);
    expect(result?.confidenceScore).toBeLessThanOrEqual(1);
  });

  it('returns a higher confidence score for a count further past the threshold', async () => {
    const config = configWithThreshold(3);
    const justOver = await checkClaimFrequency('POLICY-123', new FakeClaimHistoryQuery(4), config, asOf);
    const wayOver = await checkClaimFrequency('POLICY-123', new FakeClaimHistoryQuery(10), config, asOf);

    expect(justOver?.confidenceScore).toBeLessThan(wayOver?.confidenceScore ?? 0);
  });

  it('supports an async ClaimHistoryQuery implementation', async () => {
    const config = configWithThreshold(1);
    const query: ClaimHistoryQuery = {
      countClaimsWithinWindow: async () => 5,
    };

    const result = await checkClaimFrequency('CUSTOMER-9', query, config, asOf);

    expect(result?.type).toBe(CLAIM_FREQUENCY_INDICATOR_TYPE);
  });
});
