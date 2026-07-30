/**
 * Photo resubmission counter and escalation-to-adjuster lifecycle.
 *
 * Tracks `photoResubmissionCount` and implements the decision logic:
 * - If quality/ambiguity issue AND resubmissions < max → request clearer photos
 * - If resubmissions exhausted, or non-quality failure, or below-threshold
 *   confidence → escalate to Pending_Adjuster_Review
 *
 * _Requirements: 4.6, 4.7_
 */
import type { ConfidenceScore, SystemConfig } from '@claims/shared';
import type { AssessmentOutcome, AggregatedAssessment } from './analysisAggregation';

/** The action the caller should take after evaluating the assessment outcome. */
export type ResubmissionAction =
  | { type: 'apply_assessment'; assessment: AggregatedAssessment }
  | { type: 'request_resubmission'; resubmissionCount: number; message: string }
  | { type: 'escalate_to_adjuster'; reason: string };

/**
 * Evaluates the assessment outcome against resubmission rules and
 * returns the next action.
 *
 * @param outcome The result of running the damage analysis
 * @param currentResubmissionCount Current resubmission count on the claim
 * @param config System configuration (maxPhotoResubmissions, damageAssessmentConfidenceThreshold)
 */
export function evaluateResubmissionLifecycle(
  outcome: AssessmentOutcome,
  currentResubmissionCount: number,
  config: SystemConfig,
): ResubmissionAction {
  switch (outcome.status) {
    case 'analysis_failure':
      // Non-quality failure → immediate escalation (Req 4.7)
      return {
        type: 'escalate_to_adjuster',
        reason: `Analysis failed for a reason other than photo quality: ${outcome.error}`,
      };

    case 'quality_issue':
      // Quality/ambiguity issue → check resubmission count
      if (currentResubmissionCount >= config.maxPhotoResubmissions) {
        // Resubmissions exhausted → escalate (Req 4.7)
        return {
          type: 'escalate_to_adjuster',
          reason: `Maximum photo resubmission attempts (${config.maxPhotoResubmissions}) exhausted without achieving sufficient photo quality.`,
        };
      }
      // Can still request resubmission (Req 4.6)
      return {
        type: 'request_resubmission',
        resubmissionCount: currentResubmissionCount + 1,
        message: 'Please resubmit clearer damage photos for a more accurate assessment.',
      };

    case 'success':
      // Check confidence threshold (Req 4.7)
      if (outcome.assessment.confidenceScore < config.damageAssessmentConfidenceThreshold) {
        return {
          type: 'escalate_to_adjuster',
          reason: `Assessment confidence score (${outcome.assessment.confidenceScore.toFixed(3)}) is below the configured threshold (${config.damageAssessmentConfidenceThreshold}).`,
        };
      }
      // Assessment is good — apply it
      return { type: 'apply_assessment', assessment: outcome.assessment };
  }
}
