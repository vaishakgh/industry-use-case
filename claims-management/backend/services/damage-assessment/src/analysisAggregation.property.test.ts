/**
 * Property-based test for damage assessment aggregation round-trip.
 *
 * Property 16: Damage assessment aggregation and storage round-trip
 * For any non-empty set of photo analysis results where all photos have
 * sufficient quality, the aggregated assessment SHALL:
 * - Have the highest severity rating across all photos
 * - Have a total estimated repair cost equal to the sum of per-photo costs
 * - Have a confidence score equal to the minimum across all photos
 *
 * _Requirements: 4.2, 4.3_
 */
import fc from 'fast-check';
import { SEVERITY_RATING_VALUES, type SeverityRating } from '@claims/shared';
import {
  aggregatePhotoAnalysis,
  type RekognitionAnalysisClient,
  type SinglePhotoAnalysis,
} from './analysisAggregation';

const SEVERITY_ORDER: Record<SeverityRating, number> = { Low: 0, Medium: 1, High: 2 };

/** Arbitrary for a single photo analysis (always quality sufficient). */
const goodPhotoAnalysisArbitrary: fc.Arbitrary<SinglePhotoAnalysis> = fc.record({
  severityRating: fc.constantFrom(...SEVERITY_RATING_VALUES),
  estimatedRepairCost: fc.integer({ min: 0, max: 50000 }),
  confidenceScore: fc.double({ min: 0.01, max: 1, noNaN: true }),
  qualitySufficient: fc.constant(true),
});

describe('aggregatePhotoAnalysis property tests', () => {
  // Feature: claims-management-fnol, Property 16: Damage assessment aggregation and storage round-trip
  it('aggregates severity (max), cost (sum), confidence (min) correctly for any set of quality photos', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(goodPhotoAnalysisArbitrary, { minLength: 1, maxLength: 10 }),
        async (analyses) => {
          const photoRefs = analyses.map((_, i) => `s3://photo-${i}`);

          // Build a mock client that returns the predetermined analyses
          const client: RekognitionAnalysisClient = {
            analyzePhoto: async (ref: string) => {
              const index = parseInt(ref.replace('s3://photo-', ''), 10);
              return analyses[index]!;
            },
          };

          const result = await aggregatePhotoAnalysis(photoRefs, client);

          expect(result.status).toBe('success');
          if (result.status !== 'success') return;

          // Severity: highest
          const expectedSeverity = analyses.reduce(
            (max, a) => (SEVERITY_ORDER[a.severityRating] > SEVERITY_ORDER[max] ? a.severityRating : max),
            analyses[0]!.severityRating,
          );
          expect(result.assessment.severityRating).toBe(expectedSeverity);

          // Cost: sum
          const expectedCost = analyses.reduce((sum, a) => sum + a.estimatedRepairCost, 0);
          expect(result.assessment.estimatedRepairCost).toBe(expectedCost);

          // Confidence: min
          const expectedConfidence = Math.min(...analyses.map((a) => a.confidenceScore));
          expect(result.assessment.confidenceScore).toBeCloseTo(expectedConfidence, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns quality_issue when any photo has insufficient quality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(goodPhotoAnalysisArbitrary, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 4 }),
        async (analyses, badIndex) => {
          const idx = badIndex % analyses.length;
          // Make one photo have insufficient quality
          const modifiedAnalyses = analyses.map((a, i) =>
            i === idx ? { ...a, qualitySufficient: false } : a,
          );

          const photoRefs = modifiedAnalyses.map((_, i) => `s3://photo-${i}`);
          const client: RekognitionAnalysisClient = {
            analyzePhoto: async (ref: string) => {
              const index = parseInt(ref.replace('s3://photo-', ''), 10);
              return modifiedAnalyses[index]!;
            },
          };

          const result = await aggregatePhotoAnalysis(photoRefs, client);

          expect(result.status).toBe('quality_issue');
          if (result.status === 'quality_issue') {
            expect(result.insufficientPhotoRefs).toContain(photoRefs[idx]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
