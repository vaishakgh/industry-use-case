/**
 * Domain model types shared across the Claims Management and FNOL system,
 * mirroring the "Data Models" section of the design document field-for-field.
 */
import type {
  ClaimStatus,
  SeverityRating,
  DecisionType,
  ActorType,
  Channel,
  DecisionOutcome,
  StructuredFieldName,
} from './enums';

/**
 * A numeric confidence value in the closed range [0, 1].
 * See Glossary: Confidence_Score.
 */
export type ConfidenceScore = number;

/**
 * ISO-8601 timestamp string, as used throughout the Data Models section
 * (`createdAt`/`updatedAt`, `timestamp`, `submittedAt`, etc).
 */
export type ISODateTimeString = string;

/**
 * A single extracted Structured_Claim_Fields value together with its
 * confidence score and confirmation state.
 * See Data Models: Claim.structuredFields.
 */
export interface StructuredFieldValue {
  value: string | null;
  confidenceScore: ConfidenceScore | null;
  confirmed: boolean;
}

/**
 * The full set of Structured_Claim_Fields captured for a Claim.
 * See Glossary: Structured_Claim_Fields; Data Models: Claim.structuredFields.
 */
export interface StructuredClaimFields {
  policyNumber: StructuredFieldValue;
  incidentDate: StructuredFieldValue;
  incidentLocation: StructuredFieldValue;
  damageDescription: StructuredFieldValue;
}

/**
 * A single Fraud_Indicator identified for a Claim, with its confidence
 * score and detection timestamp.
 * See Glossary: Fraud_Indicator; Data Models: Claim.fraudIndicators,
 * AuditLogRecord.fraudIndicators.
 */
export interface FraudIndicatorRecord {
  type: string;
  confidenceScore: ConfidenceScore;
  detectedAt: ISODateTimeString;
}

/**
 * A single Claim_Status transition entry in a Claim's append-only history.
 * See Data Models: Claim.statusHistory; Property 28.
 */
export interface StatusHistoryEntry {
  status: ClaimStatus;
  timestamp: ISODateTimeString;
}

/**
 * DisputeRecord: a customer-initiated contest of a Claim decision.
 * Embedded in `Claim.dispute` and referenced from AuditLog records.
 * See Glossary: Dispute; Data Models: DisputeRecord.
 */
export interface DisputeRecord {
  reason: string;
  submittedAt: ISODateTimeString;
  originalDecision: DecisionOutcome;
  revisedDecision: DecisionOutcome | null;
  resolvedByAdjusterId: string | null;
}

/**
 * Claim: a record representing a customer's reported loss.
 * See Glossary: Claim; Data Models: Claim (DynamoDB table `Claims`, PK
 * `claimId`).
 */
export interface Claim {
  claimId: string;
  policyNumber: string;
  claimStatus: ClaimStatus;
  structuredFields: StructuredClaimFields;
  originalChannel: Channel;
  photoRefs: string[];
  documentRefs: string[];
  severityRating: SeverityRating | null;
  estimatedRepairCost: number | null;
  damageAssessmentConfidence: ConfidenceScore | null;
  photoResubmissionCount: number;
  fraudFlag: boolean;
  fraudIndicators: FraudIndicatorRecord[];
  statusHistory: StatusHistoryEntry[];
  adjusterId: string | null;
  fraudAnalystId: string | null;
  dispute: DisputeRecord | null;
  policyholderIds: string[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

/**
 * A single channel interaction recorded in a Claim_Session's history.
 * See Data Models: ClaimSession.channelHistory.
 */
export interface ChannelHistoryEntry {
  channel: Channel;
  timestamp: ISODateTimeString;
}

/**
 * Claim_Session: the persisted conversation context and extracted field
 * state associated with a single Claim across one or more channel
 * interactions.
 * See Glossary: Claim_Session; Data Models: Claim_Session (DynamoDB table
 * `ClaimSessions`, PK `claimId`).
 */
export interface ClaimSession {
  claimId: string;
  policyNumber: string | null;
  claimStatus: ClaimStatus;
  channelHistory: ChannelHistoryEntry[];
  fieldAttemptCounts: Partial<Record<StructuredFieldName, number>>;
  voiceRetryCount: number;
  confirmAttemptCounts: Partial<Record<StructuredFieldName, number>>;
  expiresAt: number;
}

/**
 * AuditLogRecord: an append-only record of an Automated_Decision, its
 * inputs, and its confidence score.
 * See Glossary: Automated_Decision, Audit_Log_Service; Data Models:
 * AuditLogRecord (DynamoDB table `AuditLog`, PK `logId`, SK `claimId`).
 */
export interface AuditLogRecord {
  logId: string;
  claimId: string;
  decisionType: DecisionType;
  inputs: Record<string, unknown>;
  confidenceScore: ConfidenceScore | null;
  fraudIndicators: FraudIndicatorRecord[] | null;
  timestamp: ISODateTimeString;
  actorType: ActorType;
  actorId: string | null;
}
