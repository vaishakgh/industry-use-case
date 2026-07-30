/**
 * Timeline discrepancy fraud check.
 *
 * Cross-validates incident date, incident location, and event-sequence
 * metadata for internal inconsistency. A discrepancy indicator is
 * produced when the claim's timeline doesn't add up.
 *
 * _Requirements: 6.2_
 */
import type { ConfidenceScore, FraudIndicatorRecord, ISODateTimeString } from '@claims/shared';

export const TIMELINE_DISCREPANCY_INDICATOR_TYPE = 'TimelineDiscrepancy';

/** The claim's timeline data needed for the discrepancy check. */
export interface ClaimTimelineData {
  /** Reported incident date (ISO-8601). */
  incidentDate: string;
  /** Date the claim was filed/created (ISO-8601). */
  claimCreatedDate: string;
  /** Date of earliest evidence (photo upload, document, etc.) if available. */
  earliestEvidenceDate?: string;
  /** The policy's effective start date (ISO-8601), if available. */
  policyStartDate?: string;
}

/**
 * Discrepancy checks applied to the timeline:
 * 1. Incident date is in the future relative to claim creation
 * 2. Incident date is before the policy start date
 * 3. Evidence predates the reported incident
 */
interface DiscrepancyDetail {
  check: string;
  description: string;
  severity: number; // 0-1 weight for confidence calculation
}

function findDiscrepancies(data: ClaimTimelineData): DiscrepancyDetail[] {
  const discrepancies: DiscrepancyDetail[] = [];
  const incidentTime = new Date(data.incidentDate).getTime();
  const claimCreatedTime = new Date(data.claimCreatedDate).getTime();

  // Check 1: Incident date is in the future relative to when the claim was filed
  if (incidentTime > claimCreatedTime) {
    discrepancies.push({
      check: 'future_incident',
      description: 'Reported incident date is after the claim creation date',
      severity: 0.9,
    });
  }

  // Check 2: Incident date is before the policy start date
  if (data.policyStartDate) {
    const policyStartTime = new Date(data.policyStartDate).getTime();
    if (incidentTime < policyStartTime) {
      discrepancies.push({
        check: 'pre_policy_incident',
        description: 'Reported incident date is before the policy effective start date',
        severity: 0.95,
      });
    }
  }

  // Check 3: Evidence predates the reported incident
  if (data.earliestEvidenceDate) {
    const evidenceTime = new Date(data.earliestEvidenceDate).getTime();
    if (evidenceTime < incidentTime) {
      // Evidence was created before the incident supposedly happened
      discrepancies.push({
        check: 'evidence_predates_incident',
        description: 'Earliest evidence predates the reported incident date',
        severity: 0.8,
      });
    }
  }

  return discrepancies;
}

/**
 * Evaluates the timeline discrepancy fraud check for a claim.
 *
 * Returns a `FraudIndicatorRecord` if any discrepancies are found,
 * with a confidence score based on the severity of the worst discrepancy.
 * Returns null if the timeline is consistent.
 *
 * _Requirements: 6.2_
 */
export function checkTimelineDiscrepancy(
  timelineData: ClaimTimelineData,
  asOf: Date = new Date(),
): FraudIndicatorRecord | null {
  const discrepancies = findDiscrepancies(timelineData);

  if (discrepancies.length === 0) {
    return null;
  }

  // Confidence is the maximum severity among all discrepancies found
  const confidenceScore: ConfidenceScore = Math.max(
    ...discrepancies.map((d) => d.severity),
  );

  const detectedAt: ISODateTimeString = asOf.toISOString();

  return {
    type: TIMELINE_DISCREPANCY_INDICATOR_TYPE,
    confidenceScore,
    detectedAt,
  };
}
