import type { SeverityRating } from '../types/enums';

/**
 * SystemConfig types.
 *
 * These are the tunable thresholds, limits, and windows referenced
 * throughout the design document's "Configuration values referenced above"
 * section. They are intentionally environment-driven (see loader.ts) so
 * that every subsystem Lambda can read consistent, centrally-defined
 * values without redeploying code to change a limit.
 */

/**
 * The combination of maximum Severity_Rating and maximum estimated repair
 * cost below which a Claim is eligible for automatic approval (Req 5.1-5.3).
 */
export interface AutoApprovalThreshold {
  /** Maximum severity rating (inclusive) still eligible for auto-approval. */
  maxSeverityRating: SeverityRating;
  /** Maximum estimated repair cost, in whole currency units (inclusive). */
  maxEstimatedRepairCost: number;
}

/**
 * Centralized, environment-configurable system settings used across all
 * subsystems (intake-agent, damage-assessment, fraud-detection,
 * orchestrator, audit-log, portal).
 */
export interface SystemConfig {
  // --- Intake / Voice channel (Requirement 1) ---
  /** Minimum Amazon Transcribe segment confidence that does not require confirm/restate (Req 1.5). */
  transcriptionConfidenceThreshold: number;
  /** Maximum unintelligible-audio retry attempts before offering a channel switch (Req 1.6). */
  maxVoiceRetries: number;
  /** Maximum confirm/restate attempts before routing to a Human_Adjuster (Req 1.8). */
  maxConfirmAttempts: number;

  // --- Structured field extraction (Requirement 2) ---
  /** Minimum extraction confidence that does not require customer confirmation (Req 2.4). */
  fieldConfidenceThreshold: number;
  /** Maximum clarifying-question attempts per field before routing to a Human_Adjuster (Req 2.3, 2.6). */
  maxClarifyingAttempts: number;

  // --- Damage photo upload & assessment (Requirement 4) ---
  /** Maximum number of photos that may be associated with a single Claim (Req 4.1). */
  maxPhotosPerClaim: number;
  /** Supported damage-photo image formats (Req 4.4), e.g. ["JPEG", "PNG", "HEIC"]. */
  supportedImageFormats: string[];
  /** Maximum accepted photo file size, in bytes (Req 4.5). */
  maxPhotoFileSizeBytes: number;
  /** Maximum photo resubmission attempts before routing to a Human_Adjuster (Req 4.6, 4.7). */
  maxPhotoResubmissions: number;
  /** Minimum damage assessment confidence score required to avoid adjuster escalation (Req 4.7). */
  damageAssessmentConfidenceThreshold: number;

  // --- Auto-approval (Requirement 5) ---
  /** Severity/cost ceiling below which a non-fraud-flagged Claim is auto-approved (Req 5.1-5.3). */
  autoApprovalThreshold: AutoApprovalThreshold;

  // --- Fraud detection (Requirement 6) ---
  /** Claim count threshold within the frequency window that triggers a fraud indicator (Req 6.1). */
  fraudFrequencyThreshold: number;
  /** Rolling time window, in days, over which claim frequency is evaluated (Req 6.1). */
  fraudFrequencyWindowDays: number;

  // --- Claims Orchestrator lifecycle (Requirement 7) ---
  /** Maximum retry attempts for a Transient_Failure before escalating (Req 7.2, 7.3). */
  stageRetryMaxAttempts: number;
  /** Backoff interval, in seconds, between stage retry attempts (Req 7.2). */
  stageRetryBackoffSeconds: number;

  // --- Audit log retention (Requirement 8) ---
  /** Retention period, in days, for immutable Automated_Decision audit records (Req 8.2). */
  auditRetentionPeriodDays: number;

  // --- Customer portal session (Requirement 9) ---
  /** Idle-session timeout, in minutes, before requiring re-authentication (Req 9.6). Valid range: 5-30. */
  sessionTimeoutMinutes: number;

  // --- Dispute submission (Requirement 11) ---
  /** Maximum allowed length, in characters, for a dispute reason (Req 11.1, 11.5). */
  maxDisputeReasonLength: number;

  // --- Portal document upload (Requirement 10) ---
  /** Supported portal document formats (Req 10.2, 10.3), e.g. ["PDF", "JPEG", "PNG"]. */
  supportedDocumentFormats: string[];
  /** Maximum accepted document file size, in bytes (Req 10.2, 10.3). */
  maxDocumentFileSizeBytes: number;
}

/** A minimal environment lookup shape, so the loader can be tested without process.env mutation. */
export type ConfigEnv = Partial<Record<string, string | undefined>>;
