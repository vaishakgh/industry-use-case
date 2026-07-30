/**
 * Property-based test for fraud analyst decision resolution.
 *
 * Property 25: Fraud analyst decision resolution
 * A fraud analyst's decision either clears the flag (returning to
 * Fraud_Check status) or denies the claim (setting status to Denied).
 *
 * _Requirements: 6.6_
 */
import fc from 'fast-check';
import { resolveFraudReview, type FraudAnalystDecision } from './resolveFraudReview';

describe('resolveFraudReview property tests', () => {
  // Feature: claims-management-fnol, Property 25: Fraud analyst decision resolution
  it('clears the flag and sets status to Fraud_Check on "clear" decision, or sets Denied on "deny"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 26 }),  // claimId
        fc.string({ minLength: 3, maxLength: 20 }),   // analystId
        fc.constantFrom<FraudAnalystDecision>('clear', 'deny'),
        (claimId, analystId, decision) => {
          const result = resolveFraudReview({
            claimId,
            analystId,
            decision,
            timestamp: '2024-06-01T00:00:00.000Z',
          });

          // Always records the analyst identity and decision
          expect(result.claimId).toBe(claimId);
          expect(result.analystId).toBe(analystId);
          expect(result.decision).toBe(decision);

          if (decision === 'clear') {
            expect(result.newClaimStatus).toBe('Fraud_Check');
            expect(result.fraudFlagCleared).toBe(true);
          } else {
            expect(result.newClaimStatus).toBe('Denied');
            expect(result.fraudFlagCleared).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
