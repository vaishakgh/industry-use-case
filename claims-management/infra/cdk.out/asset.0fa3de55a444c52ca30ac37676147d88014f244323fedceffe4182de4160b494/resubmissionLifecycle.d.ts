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
import type { SystemConfig } from '@claims/shared';
import type { AssessmentOutcome, AggregatedAssessment } from './analysisAggregation';
/** The action the caller should take after evaluating the assessment outcome. */
export type ResubmissionAction = {
    type: 'apply_assessment';
    assessment: AggregatedAssessment;
} | {
    type: 'request_resubmission';
    resubmissionCount: number;
    message: string;
} | {
    type: 'escalate_to_adjuster';
    reason: string;
};
/**
 * Evaluates the assessment outcome against resubmission rules and
 * returns the next action.
 *
 * @param outcome The result of running the damage analysis
 * @param currentResubmissionCount Current resubmission count on the claim
 * @param config System configuration (maxPhotoResubmissions, damageAssessmentConfidenceThreshold)
 */
export declare function evaluateResubmissionLifecycle(outcome: AssessmentOutcome, currentResubmissionCount: number, config: SystemConfig): ResubmissionAction;
//# sourceMappingURL=resubmissionLifecycle.d.ts.map