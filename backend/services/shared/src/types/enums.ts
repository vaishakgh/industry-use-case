/**
 * Enumerations shared across the Claims Management and FNOL system.
 *
 * Each enum is modeled as a TypeScript string-literal union (matching the
 * "string enum" fields described in the design's Data Models section, which
 * are persisted as plain strings in DynamoDB) alongside a `readonly` array of
 * all valid values. The values array lets callers validate/enumerate the
 * value set at runtime (e.g., generators for property-based tests, or
 * exhaustiveness checks) without duplicating the literal list.
 */

/**
 * Claim_Status: the current lifecycle stage of a Claim.
 * See Glossary: Claim_Status; Data Models: Claim.claimStatus.
 */
export const CLAIM_STATUS_VALUES = [
  'Intake',
  'Assessment',
  'Fraud_Check',
  'Pending_Adjuster_Review',
  'Approved',
  'Denied',
  'Paid',
  'Disputed',
  'Resolved',
] as const;

export type ClaimStatus = (typeof CLAIM_STATUS_VALUES)[number];

/**
 * Severity_Rating: damage severity classification produced by the
 * Damage_Assessment_Service.
 * See Glossary: Severity_Rating; Data Models: Claim.severityRating.
 */
export const SEVERITY_RATING_VALUES = ['Low', 'Medium', 'High'] as const;

export type SeverityRating = (typeof SEVERITY_RATING_VALUES)[number];

/**
 * decisionType: the kind of Automated_Decision recorded in an
 * AuditLogRecord.
 * See Data Models: AuditLogRecord.decisionType.
 */
export const DECISION_TYPE_VALUES = [
  'FieldExtraction',
  'DamageAssessment',
  'FraudFlag',
  'Approval',
  'Denial',
  'Payout',
  'DisputeResolution',
  'AccessDenied',
] as const;

export type DecisionType = (typeof DECISION_TYPE_VALUES)[number];

/**
 * Role: the Cognito-group-backed human/actor roles used for authorization
 * checks throughout the system.
 * See Data Models: CustomerAccount (Cognito group); Security & Data
 * Protection section.
 */
export const ROLE_VALUES = [
  'Customer',
  'Human_Adjuster',
  'Fraud_Analyst',
  'ComplianceOfficer',
] as const;

export type Role = (typeof ROLE_VALUES)[number];

/**
 * actorType: who/what produced an AuditLogRecord entry.
 * See Data Models: AuditLogRecord.actorType.
 */
export const ACTOR_TYPE_VALUES = [
  'System',
  'HumanAdjuster',
  'FraudAnalyst',
  'Customer',
] as const;

export type ActorType = (typeof ACTOR_TYPE_VALUES)[number];

/**
 * Intake channel: Voice, Email, or Chat.
 * See Glossary: Voice_Channel, Email_Channel, Chat_Channel; Data Models:
 * Claim.originalChannel.
 */
export const CHANNEL_VALUES = ['Voice', 'Email', 'Chat'] as const;

export type Channel = (typeof CHANNEL_VALUES)[number];

/**
 * Structured_Claim_Fields: the four required extracted fields captured
 * during intake.
 * See Glossary: Structured_Claim_Fields; Data Models: Claim.structuredFields,
 * ClaimSession.fieldAttemptCounts.
 */
export const STRUCTURED_FIELD_NAME_VALUES = [
  'policyNumber',
  'incidentDate',
  'incidentLocation',
  'damageDescription',
] as const;

export type StructuredFieldName = (typeof STRUCTURED_FIELD_NAME_VALUES)[number];

/**
 * The two allowed values for an original or revised claim decision, used by
 * DisputeRecord.originalDecision / revisedDecision.
 */
export const DECISION_OUTCOME_VALUES = ['Approved', 'Denied'] as const;

export type DecisionOutcome = (typeof DECISION_OUTCOME_VALUES)[number];
