/**
 * @claims/damage-assessment
 *
 * Damage Assessment Service: validates and stores uploaded damage photos,
 * invokes Amazon Rekognition to aggregate per-photo results into a single
 * Severity_Rating, estimated repair cost, and Confidence_Score for a Claim.
 */
export const DAMAGE_ASSESSMENT_PACKAGE_NAME = '@claims/damage-assessment';

export { handlePhotoUpload } from './photoUpload';
export type { PhotoUploadResult, ClaimPhotoState } from './photoUpload';

export { aggregatePhotoAnalysis } from './analysisAggregation';
export type {
  SinglePhotoAnalysis,
  RekognitionAnalysisClient,
  AggregatedAssessment,
  AssessmentOutcome,
} from './analysisAggregation';

export { evaluateResubmissionLifecycle } from './resubmissionLifecycle';
export type { ResubmissionAction } from './resubmissionLifecycle';

export { recordDamageAssessmentDecision } from './auditIntegration';
export type { RecordDecisionBeforeEffectFn } from './auditIntegration';
