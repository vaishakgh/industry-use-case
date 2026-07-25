import type { SeverityRating } from '../types/enums';
import { DEFAULT_SYSTEM_CONFIG } from './defaults';
import { AutoApprovalThreshold, ConfigEnv, SystemConfig } from './types';

/**
 * Raised when a `SystemConfig` value is present (via environment variable)
 * but fails validation (wrong type, out of range, or an invalid enum
 * member). Loading never silently clamps or ignores an invalid explicit
 * value -- it fails fast so misconfiguration is caught at startup rather
 * than producing subtly wrong behavior at runtime.
 */
export class SystemConfigValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(`Invalid SystemConfig value for "${field}": ${message}`);
    this.name = 'SystemConfigValidationError';
  }
}

const SEVERITY_RATING_LEVELS: readonly SeverityRating[] = ['Low', 'Medium', 'High'];

/** Environment variable names for each configurable `SystemConfig` field. */
export const SYSTEM_CONFIG_ENV_VARS = {
  transcriptionConfidenceThreshold: 'CLAIMS_TRANSCRIPTION_CONFIDENCE_THRESHOLD',
  maxVoiceRetries: 'CLAIMS_MAX_VOICE_RETRIES',
  maxConfirmAttempts: 'CLAIMS_MAX_CONFIRM_ATTEMPTS',
  fieldConfidenceThreshold: 'CLAIMS_FIELD_CONFIDENCE_THRESHOLD',
  maxClarifyingAttempts: 'CLAIMS_MAX_CLARIFYING_ATTEMPTS',
  maxPhotosPerClaim: 'CLAIMS_MAX_PHOTOS_PER_CLAIM',
  supportedImageFormats: 'CLAIMS_SUPPORTED_IMAGE_FORMATS',
  maxPhotoFileSizeBytes: 'CLAIMS_MAX_PHOTO_FILE_SIZE_BYTES',
  maxPhotoResubmissions: 'CLAIMS_MAX_PHOTO_RESUBMISSIONS',
  damageAssessmentConfidenceThreshold: 'CLAIMS_DAMAGE_ASSESSMENT_CONFIDENCE_THRESHOLD',
  autoApprovalMaxSeverityRating: 'CLAIMS_AUTO_APPROVAL_MAX_SEVERITY_RATING',
  autoApprovalMaxEstimatedRepairCost: 'CLAIMS_AUTO_APPROVAL_MAX_ESTIMATED_REPAIR_COST',
  fraudFrequencyThreshold: 'CLAIMS_FRAUD_FREQUENCY_THRESHOLD',
  fraudFrequencyWindowDays: 'CLAIMS_FRAUD_FREQUENCY_WINDOW_DAYS',
  stageRetryMaxAttempts: 'CLAIMS_STAGE_RETRY_MAX_ATTEMPTS',
  stageRetryBackoffSeconds: 'CLAIMS_STAGE_RETRY_BACKOFF_SECONDS',
  auditRetentionPeriodDays: 'CLAIMS_AUDIT_RETENTION_PERIOD_DAYS',
  sessionTimeoutMinutes: 'CLAIMS_SESSION_TIMEOUT_MINUTES',
  maxDisputeReasonLength: 'CLAIMS_MAX_DISPUTE_REASON_LENGTH',
  supportedDocumentFormats: 'CLAIMS_SUPPORTED_DOCUMENT_FORMATS',
  maxDocumentFileSizeBytes: 'CLAIMS_MAX_DOCUMENT_FILE_SIZE_BYTES',
} as const;

/** Session timeout allowed range, per Requirement 9.6 (default 15, range 5-30 minutes). */
export const SESSION_TIMEOUT_MINUTES_RANGE = { min: 5, max: 30 } as const;

function parseNumber(field: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new SystemConfigValidationError(field, `expected a finite number, got "${raw}"`);
  }
  return value;
}

function parseInteger(field: string, raw: string): number {
  const value = parseNumber(field, raw);
  if (!Number.isInteger(value)) {
    throw new SystemConfigValidationError(field, `expected an integer, got "${raw}"`);
  }
  return value;
}

function parseStringList(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function requireNonNegative(field: string, value: number): void {
  if (value < 0) {
    throw new SystemConfigValidationError(field, `must be >= 0, got ${value}`);
  }
}

function requirePositive(field: string, value: number): void {
  if (value <= 0) {
    throw new SystemConfigValidationError(field, `must be > 0, got ${value}`);
  }
}

function requireUnitInterval(field: string, value: number): void {
  if (value < 0 || value > 1) {
    throw new SystemConfigValidationError(field, `must be within [0, 1], got ${value}`);
  }
}

function requireNonEmptyList(field: string, value: string[]): void {
  if (value.length === 0) {
    throw new SystemConfigValidationError(field, 'must contain at least one entry');
  }
}

function requireSeverityRatingLevel(field: string, raw: string): SeverityRating {
  if (!SEVERITY_RATING_LEVELS.includes(raw as SeverityRating)) {
    throw new SystemConfigValidationError(
      field,
      `must be one of ${SEVERITY_RATING_LEVELS.join(', ')}, got "${raw}"`,
    );
  }
  return raw as SeverityRating;
}

function requireSessionTimeoutRange(value: number): void {
  const { min, max } = SESSION_TIMEOUT_MINUTES_RANGE;
  if (value < min || value > max) {
    throw new SystemConfigValidationError(
      'sessionTimeoutMinutes',
      `must be within [${min}, ${max}], got ${value}`,
    );
  }
}

/**
 * Loads the `SystemConfig` used across all subsystems.
 *
 * Every field falls back to `DEFAULT_SYSTEM_CONFIG` when its corresponding
 * environment variable (see `SYSTEM_CONFIG_ENV_VARS`) is absent or empty.
 * When an environment variable is present, it is parsed and validated
 * (type, range, or enum membership as appropriate); an invalid explicit
 * value throws `SystemConfigValidationError` rather than silently falling
 * back to the default.
 *
 * @param env Environment lookup to read from. Defaults to `process.env`.
 */
export function loadSystemConfig(env: ConfigEnv = process.env): SystemConfig {
  const vars = SYSTEM_CONFIG_ENV_VARS;
  const defaults = DEFAULT_SYSTEM_CONFIG;

  const transcriptionConfidenceThreshold = readNumber(
    env,
    vars.transcriptionConfidenceThreshold,
    defaults.transcriptionConfidenceThreshold,
    (field, value) => requireUnitInterval(field, value),
  );

  const maxVoiceRetries = readInteger(env, vars.maxVoiceRetries, defaults.maxVoiceRetries, requireNonNegative);

  const maxConfirmAttempts = readInteger(
    env,
    vars.maxConfirmAttempts,
    defaults.maxConfirmAttempts,
    requireNonNegative,
  );

  const fieldConfidenceThreshold = readNumber(
    env,
    vars.fieldConfidenceThreshold,
    defaults.fieldConfidenceThreshold,
    requireUnitInterval,
  );

  const maxClarifyingAttempts = readInteger(
    env,
    vars.maxClarifyingAttempts,
    defaults.maxClarifyingAttempts,
    requireNonNegative,
  );

  const maxPhotosPerClaim = readInteger(env, vars.maxPhotosPerClaim, defaults.maxPhotosPerClaim, requirePositive);

  const supportedImageFormats = readStringList(
    env,
    vars.supportedImageFormats,
    defaults.supportedImageFormats,
    requireNonEmptyList,
  );

  const maxPhotoFileSizeBytes = readInteger(
    env,
    vars.maxPhotoFileSizeBytes,
    defaults.maxPhotoFileSizeBytes,
    requirePositive,
  );

  const maxPhotoResubmissions = readInteger(
    env,
    vars.maxPhotoResubmissions,
    defaults.maxPhotoResubmissions,
    requireNonNegative,
  );

  const damageAssessmentConfidenceThreshold = readNumber(
    env,
    vars.damageAssessmentConfidenceThreshold,
    defaults.damageAssessmentConfidenceThreshold,
    requireUnitInterval,
  );

  const autoApprovalMaxSeverityRatingRaw = env[vars.autoApprovalMaxSeverityRating];
  const autoApprovalMaxSeverityRating =
    autoApprovalMaxSeverityRatingRaw && autoApprovalMaxSeverityRatingRaw.length > 0
      ? requireSeverityRatingLevel('autoApprovalThreshold.maxSeverityRating', autoApprovalMaxSeverityRatingRaw)
      : defaults.autoApprovalThreshold.maxSeverityRating;

  const autoApprovalMaxEstimatedRepairCost = readNumber(
    env,
    vars.autoApprovalMaxEstimatedRepairCost,
    defaults.autoApprovalThreshold.maxEstimatedRepairCost,
    requireNonNegative,
    'autoApprovalThreshold.maxEstimatedRepairCost',
  );

  const autoApprovalThreshold: AutoApprovalThreshold = {
    maxSeverityRating: autoApprovalMaxSeverityRating,
    maxEstimatedRepairCost: autoApprovalMaxEstimatedRepairCost,
  };

  const fraudFrequencyThreshold = readInteger(
    env,
    vars.fraudFrequencyThreshold,
    defaults.fraudFrequencyThreshold,
    requireNonNegative,
  );

  const fraudFrequencyWindowDays = readInteger(
    env,
    vars.fraudFrequencyWindowDays,
    defaults.fraudFrequencyWindowDays,
    requirePositive,
  );

  const stageRetryMaxAttempts = readInteger(
    env,
    vars.stageRetryMaxAttempts,
    defaults.stageRetryMaxAttempts,
    requireNonNegative,
  );

  const stageRetryBackoffSeconds = readNumber(
    env,
    vars.stageRetryBackoffSeconds,
    defaults.stageRetryBackoffSeconds,
    requireNonNegative,
  );

  const auditRetentionPeriodDays = readInteger(
    env,
    vars.auditRetentionPeriodDays,
    defaults.auditRetentionPeriodDays,
    requirePositive,
  );

  const sessionTimeoutMinutes = readInteger(
    env,
    vars.sessionTimeoutMinutes,
    defaults.sessionTimeoutMinutes,
    (_field, value) => requireSessionTimeoutRange(value),
  );

  const maxDisputeReasonLength = readInteger(
    env,
    vars.maxDisputeReasonLength,
    defaults.maxDisputeReasonLength,
    requirePositive,
  );

  const supportedDocumentFormats = readStringList(
    env,
    vars.supportedDocumentFormats,
    defaults.supportedDocumentFormats,
    requireNonEmptyList,
  );

  const maxDocumentFileSizeBytes = readInteger(
    env,
    vars.maxDocumentFileSizeBytes,
    defaults.maxDocumentFileSizeBytes,
    requirePositive,
  );

  return {
    transcriptionConfidenceThreshold,
    maxVoiceRetries,
    maxConfirmAttempts,
    fieldConfidenceThreshold,
    maxClarifyingAttempts,
    maxPhotosPerClaim,
    supportedImageFormats,
    maxPhotoFileSizeBytes,
    maxPhotoResubmissions,
    damageAssessmentConfidenceThreshold,
    autoApprovalThreshold,
    fraudFrequencyThreshold,
    fraudFrequencyWindowDays,
    stageRetryMaxAttempts,
    stageRetryBackoffSeconds,
    auditRetentionPeriodDays,
    sessionTimeoutMinutes,
    maxDisputeReasonLength,
    supportedDocumentFormats,
    maxDocumentFileSizeBytes,
  };
}

function readNumber(
  env: ConfigEnv,
  envVarName: string,
  defaultValue: number,
  validate: (field: string, value: number) => void,
  fieldOverride?: string,
): number {
  const raw = env[envVarName];
  const field = fieldOverride ?? envVarName;
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const value = parseNumber(field, raw);
  validate(field, value);
  return value;
}

function readInteger(
  env: ConfigEnv,
  envVarName: string,
  defaultValue: number,
  validate: (field: string, value: number) => void,
  fieldOverride?: string,
): number {
  const raw = env[envVarName];
  const field = fieldOverride ?? envVarName;
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const value = parseInteger(field, raw);
  validate(field, value);
  return value;
}

function readStringList(
  env: ConfigEnv,
  envVarName: string,
  defaultValue: string[],
  validate: (field: string, value: string[]) => void,
): string[] {
  const raw = env[envVarName];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const value = parseStringList(raw);
  validate(envVarName, value);
  return value;
}
