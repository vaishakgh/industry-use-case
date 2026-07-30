/**
 * PII access authorization predicate with denial audit.
 *
 * Grants access to stored PII if and only if the requester is an authorized
 * system component or holds an authorized human role. Records every denial
 * as an AccessDenied record via the Audit Log Service.
 *
 * _Requirements: 12.3, 12.4_
 */
import type { AuditLogRecord, ISODateTimeString, Role } from '@claims/shared';

/** Roles authorized to access PII. */
export const PII_AUTHORIZED_ROLES: Role[] = ['Human_Adjuster', 'Fraud_Analyst', 'ComplianceOfficer'];

/** The PII access check result. */
export type PiiAccessResult =
  | { granted: true }
  | { granted: false; reason: string };

/** Audit function for recording PII access denials. */
export interface RecordPiiDenialFn {
  (input: {
    decisionType: 'AccessDenied';
    claimId: string;
    inputs: Record<string, unknown>;
    confidenceScore: null;
    timestamp: ISODateTimeString;
    fraudIndicators: null;
    actorType: 'System';
    actorId: string | null;
  }): Promise<AuditLogRecord>;
}

/**
 * Checks whether a requester is authorized to access PII.
 *
 * @param requesterRole The role of the requester
 * @param isSystemComponent Whether the requester is an authorized system component
 */
export function checkPiiAccess(
  requesterRole: Role | null,
  isSystemComponent: boolean,
): PiiAccessResult {
  if (isSystemComponent) {
    return { granted: true };
  }

  if (requesterRole && PII_AUTHORIZED_ROLES.includes(requesterRole)) {
    return { granted: true };
  }

  return {
    granted: false,
    reason: 'Access to personally identifiable information is restricted to authorized roles.',
  };
}

/**
 * Evaluates PII access and records a denial audit event if access is denied.
 */
export async function evaluatePiiAccessWithAudit(
  claimId: string,
  requesterId: string,
  requesterRole: Role | null,
  isSystemComponent: boolean,
  recordDenial: RecordPiiDenialFn,
): Promise<PiiAccessResult> {
  const result = checkPiiAccess(requesterRole, isSystemComponent);

  if (!result.granted) {
    await recordDenial({
      decisionType: 'AccessDenied',
      claimId,
      inputs: { requesterId, requesterRole, isSystemComponent },
      confidenceScore: null,
      timestamp: new Date().toISOString(),
      fraudIndicators: null,
      actorType: 'System',
      actorId: requesterId,
    });
  }

  return result;
}
