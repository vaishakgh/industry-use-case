/**
 * Property-based test for photo resubmission-then-escalation lifecycle.
 *
 * Property 18: Photo resubmission-then-escalation lifecycle
 * For any sequence of assessment outcomes on a claim:
 * - Quality issues with resubmissions below max → request_resubmission
 * - Quality issues with resubmissions at/above max → escalate_to_adjuster
 * - Non-quality failures → immediate escalate_to_adjuster
 * - Success with confidence below threshold → escalate_to_adjuster
 * - Success with confidence at/above threshold → apply_assessment
 *
 * _Requirements: 4.6, 4.7_
 */
import fc from 'fast-check';
import { DEFAULT_SYSTEM_CONFIG, SEVERITY_RATING_VALUES, type SystemConfig } from '@claims/shared';
import { evaluateResubmissionLifecycle } from './resubmissionLifecycle';
import type { AssessmentOutcome, AggregatedAssessment } from './analysisAggregation';

const configArbitrary: fc.Arbitrary<SystemConfig> = fc.record({
  maxPhotoResubmissions: fc.integer({ min: 1, max: 5 }),
  damageAssessmentConfidenceThreshold: fc.double({ min: 0.1, max: 0.99, noNaN: true }),
}).map((overrides) => ({ ...DEFAULT_SYSTEM_CONFIG, ...overrides }));

const assessmentArbitrary: fc.Arbitrary<AggregatedAssessment> = fc.record({
  severityRating: fc.constantFrom(...SEVERITY_RATING_VALUES),
  estimatedRepairCost: fc.integer({ min: 0, max: 50000 }),
  confidenceScore: fc.double({ min: 0, max: 1, noNaN: true }),
});

describe('evaluateResubmissionLifecycle property tests', () => {
  // Feature: claims-management-fnol, Property 18: Photo resubmission-then-escalation lifecycle
  describe('Property 18: Photo resubmission-then-escalation lifecycle', () => {
    it('requests resubmission for quality issues when count < max', () => {
      fc.assert(
        fc.property(
          configArbitrary,
          fc.integer({ min: 0, max: 10 }),
          (config, count) => {
            const currentCount = count % config.maxPhotoResubmissions; // ensure < max
            const outcome: AssessmentOutcome = {
              status: 'quality_issue',
              insufficientPhotoRefs: ['s3://photo-0'],
            };

            const action = evaluateResubmissionLifecycle(outcome, currentCount, config);

            expect(action.type).toBe('request_resubmission');
            if (action.type === 'request_resubmission') {
              expect(action.resubmissionCount).toBe(currentCount + 1);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('escalates for quality issues when resubmission count >= max', () => {
      fc.assert(
        fc.property(
          configArbitrary,
          fc.integer({ min: 0, max: 10 }),
          (config, offset) => {
            const currentCount = config.maxPhotoResubmissions + offset; // >= max
            const outcome: AssessmentOutcome = {
              status: 'quality_issue',
              insufficientPhotoRefs: ['s3://photo-0'],
            };

            const action = evaluateResubmissionLifecycle(outcome, currentCount, config);

            expect(action.type).toBe('escalate_to_adjuster');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('immediately escalates on non-quality analysis failures regardless of count', () => {
      fc.assert(
        fc.property(
          configArbitrary,
          fc.integer({ min: 0, max: 10 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (config, count, errorMsg) => {
            const outcome: AssessmentOutcome = {
              status: 'analysis_failure',
              error: errorMsg,
            };

            const action = evaluateResubmissionLifecycle(outcome, count, config);

            expect(action.type).toBe('escalate_to_adjuster');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('escalates when assessment confidence is below threshold', () => {
      fc.assert(
        fc.property(configArbitrary, assessmentArbitrary, (config, assessment) => {
          // Force confidence below threshold
          const lowConfAssessment = {
            ...assessment,
            confidenceScore: config.damageAssessmentConfidenceThreshold * 0.5,
          };
          const outcome: AssessmentOutcome = { status: 'success', assessment: lowConfAssessment };

          const action = evaluateResubmissionLifecycle(outcome, 0, config);

          expect(action.type).toBe('escalate_to_adjuster');
        }),
        { numRuns: 100 },
      );
    });

    it('applies assessment when confidence is at or above threshold', () => {
      fc.assert(
        fc.property(configArbitrary, assessmentArbitrary, (config, assessment) => {
          // Force confidence at or above threshold
          const highConfAssessment = {
            ...assessment,
            confidenceScore: config.damageAssessmentConfidenceThreshold + 0.001,
          };
          const outcome: AssessmentOutcome = { status: 'success', assessment: highConfAssessment };

          const action = evaluateResubmissionLifecycle(outcome, 0, config);

          expect(action.type).toBe('apply_assessment');
          if (action.type === 'apply_assessment') {
            expect(action.assessment).toEqual(highConfAssessment);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
