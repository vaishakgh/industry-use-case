/**
 * Property-based test for timeline discrepancy fraud indicator.
 *
 * Property 22: Timeline discrepancy fraud indicator
 * The timeline discrepancy check identifies a Fraud_Indicator when
 * inconsistencies exist in the claim's timeline data (future incident dates,
 * pre-policy incidents, evidence predating incidents).
 *
 * _Requirements: 6.2_
 */
import fc from 'fast-check';
import {
  TIMELINE_DISCREPANCY_INDICATOR_TYPE,
  checkTimelineDiscrepancy,
  type ClaimTimelineData,
} from './timelineDiscrepancy';

describe('checkTimelineDiscrepancy property tests', () => {
  const asOf = new Date('2024-06-01T00:00:00.000Z');

  // Feature: claims-management-fnol, Property 22: Timeline discrepancy fraud indicator
  it('returns an indicator when incident date is after claim creation (future incident)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }), // days in the future
        (daysAhead) => {
          const claimCreated = new Date('2024-01-15T00:00:00.000Z');
          const incidentDate = new Date(claimCreated.getTime() + daysAhead * 86400000);

          const data: ClaimTimelineData = {
            incidentDate: incidentDate.toISOString(),
            claimCreatedDate: claimCreated.toISOString(),
          };

          const result = checkTimelineDiscrepancy(data, asOf);

          expect(result).not.toBeNull();
          expect(result?.type).toBe(TIMELINE_DISCREPANCY_INDICATOR_TYPE);
          expect(result?.confidenceScore).toBeGreaterThan(0);
          expect(result?.confidenceScore).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns an indicator when incident date is before policy start date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }), // days before policy start
        (daysBefore) => {
          const policyStart = new Date('2024-03-01T00:00:00.000Z');
          const incidentDate = new Date(policyStart.getTime() - daysBefore * 86400000);

          const data: ClaimTimelineData = {
            incidentDate: incidentDate.toISOString(),
            claimCreatedDate: '2024-06-01T00:00:00.000Z',
            policyStartDate: policyStart.toISOString(),
          };

          const result = checkTimelineDiscrepancy(data, asOf);

          expect(result).not.toBeNull();
          expect(result?.type).toBe(TIMELINE_DISCREPANCY_INDICATOR_TYPE);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns null when timeline is consistent (incident after policy start, before claim creation)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // days after policy start
        fc.integer({ min: 1, max: 100 }), // days before claim creation
        (daysAfterPolicy, daysBeforeClaim) => {
          const policyStart = new Date('2024-01-01T00:00:00.000Z');
          const claimCreated = new Date('2024-12-01T00:00:00.000Z');
          // Incident between policy start and claim creation
          const incidentDate = new Date(
            policyStart.getTime() + daysAfterPolicy * 86400000,
          );

          // Only test if the incident is actually before claim creation
          if (incidentDate.getTime() >= claimCreated.getTime()) return;

          const data: ClaimTimelineData = {
            incidentDate: incidentDate.toISOString(),
            claimCreatedDate: claimCreated.toISOString(),
            policyStartDate: policyStart.toISOString(),
          };

          const result = checkTimelineDiscrepancy(data, asOf);

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
