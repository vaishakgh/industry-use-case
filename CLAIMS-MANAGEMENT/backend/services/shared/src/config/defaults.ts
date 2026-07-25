import { SystemConfig } from './types';

/**
 * Default `SystemConfig` values, applied whenever the corresponding
 * environment variable is not set.
 *
 * Defaults documented in design.md ("Configuration values referenced
 * above" / Requirement 9.6) are preserved verbatim:
 *   - `sessionTimeoutMinutes` defaults to 15 (allowed range 5-30).
 *   - `maxClarifyingAttempts` defaults to 3 (Req 2.3/2.6).
 *   - `stageRetryMaxAttempts` defaults to 3 with a 5-second backoff,
 *     matching the Step Functions Retry block in the Architecture section.
 *
 * Remaining defaults are reasonable, documented starting points for
 * values the design leaves to operational configuration; every value
 * can be overridden via environment variables (see loader.ts).
 */
export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  // Intake / Voice channel
  transcriptionConfidenceThreshold: 0.75,
  maxVoiceRetries: 3,
  maxConfirmAttempts: 3,

  // Structured field extraction
  fieldConfidenceThreshold: 0.75,
  maxClarifyingAttempts: 3,

  // Damage photo upload & assessment
  maxPhotosPerClaim: 10,
  supportedImageFormats: ['JPEG', 'PNG', 'HEIC'],
  maxPhotoFileSizeBytes: 10 * 1024 * 1024, // 10 MB, per design.md example
  maxPhotoResubmissions: 2,
  damageAssessmentConfidenceThreshold: 0.6,

  // Auto-approval
  autoApprovalThreshold: {
    maxSeverityRating: 'Low',
    maxEstimatedRepairCost: 2000,
  },

  // Fraud detection
  fraudFrequencyThreshold: 3,
  fraudFrequencyWindowDays: 365,

  // Claims Orchestrator lifecycle
  stageRetryMaxAttempts: 3,
  stageRetryBackoffSeconds: 5,

  // Audit log retention
  auditRetentionPeriodDays: 2555, // ~7 years, typical financial-services regulatory retention

  // Customer portal session
  sessionTimeoutMinutes: 15,

  // Dispute submission
  maxDisputeReasonLength: 2000,

  // Portal document upload
  supportedDocumentFormats: ['PDF', 'JPEG', 'PNG'],
  maxDocumentFileSizeBytes: 10 * 1024 * 1024, // 10 MB
};
