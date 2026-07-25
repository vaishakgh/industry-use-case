/**
 * `GET /audit/claims/{claimId}` query handler.
 *
 * Gates access on a compliance-officer group claim populated on
 * `event.requestContext.authorizer` by an upstream API Gateway Lambda
 * authorizer, then queries the `ClaimIdIndex` GSI (via the
 * `AuditLogRepository` from task 2.1, `queryAuditLogByClaimId`) for every
 * `AuditLogRecord` associated with the requested `claimId`, returned in
 * chronological order (oldest first) -- the repository already guarantees
 * this ordering (see auditLogRepository.ts: `ScanIndexForward: true` on the
 * ULID-sortable `logId` sort key).
 *
 * Authorization is checked *before* the repository is ever called: an
 * unauthorized request receives a 403 response without any query being
 * issued (Requirement 8.5, Property 32).
 *
 * ## Authorizer context shape
 *
 * This isn't pinned down elsewhere in the codebase yet, so a reasonable,
 * explicit shape is defined here (`AuditHistoryAuthorizerContext`) that a
 * Lambda authorizer is expected to populate on
 * `event.requestContext.authorizer`:
 *
 * ```
 * {
 *   groups?: string[] | string; // e.g. ["ComplianceOfficer"] or "ComplianceOfficer,Human_Adjuster"
 *   claims?: { 'cognito:groups'?: string[] | string };
 * }
 * ```
 *
 * API Gateway Lambda authorizer `context` values are conventionally
 * stringified (a raw array is not guaranteed to survive the round-trip), so
 * `groups` is accepted as either a real string array (e.g. when invoked
 * directly, as in tests, or via an authorizer that returns a JSON-encodable
 * context object) or a comma-separated string (the common shape once API
 * Gateway has serialized the authorizer context). As a fallback, the
 * standard Cognito User Pool group claim `claims['cognito:groups']` is
 * checked in the same two shapes, in case the authorizer instead forwards
 * raw Cognito claims rather than a pre-extracted `groups` field.
 *
 * A request is treated as compliance-officer-authorized if and only if
 * `'ComplianceOfficer'` (see shared `Role` enum) appears in any of the above
 * sources.
 *
 * See design.md: "6. Audit Log Service" ("A query API (`GET
 * /audit/claims/{claimId}`), gated by a Cognito `ComplianceOfficer` group
 * claim via an API Gateway Lambda authorizer, returns records in
 * chronological order ... requests without that group claim receive
 * `403`").
 *
 * _Requirements: 8.4, 8.5_
 */
import type { AuditLogRecord } from '@claims/shared';
import { AuditLogAccessError, type AuditLogRepository } from '../repository/auditLogRepository';

/** The Cognito group name that grants audit-history read access. */
export const COMPLIANCE_OFFICER_GROUP = 'ComplianceOfficer';

/**
 * Authorizer context shape expected on `event.requestContext.authorizer`.
 * See the module doc comment above for the rationale behind accepting both
 * array and comma-separated-string encodings.
 */
export interface AuditHistoryAuthorizerContext {
  groups?: string[] | string;
  claims?: {
    'cognito:groups'?: string[] | string;
  };
  [key: string]: unknown;
}

/**
 * Minimal API Gateway Lambda proxy integration event shape needed by this
 * handler: a `claimId` path parameter and the authorizer context populated
 * by an upstream Lambda authorizer.
 */
export interface AuditHistoryRequestEvent {
  pathParameters?: { claimId?: string | null } | null;
  requestContext: {
    authorizer?: AuditHistoryAuthorizerContext | null;
  };
}

/** API Gateway Lambda proxy integration response shape. */
export interface AuditHistoryResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

function toGroupList(value: string[] | string | undefined): string[] {
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return value.split(',').map((group) => group.trim()).filter((group) => group.length > 0);
}

/**
 * Determines whether the requester carries the compliance-officer group
 * claim, per the `AuditHistoryAuthorizerContext` shape documented above.
 */
export function isComplianceOfficer(authorizer: AuditHistoryAuthorizerContext | null | undefined): boolean {
  if (!authorizer) {
    return false;
  }
  const groups = toGroupList(authorizer.groups);
  const cognitoGroups = toGroupList(authorizer.claims?.['cognito:groups']);
  return groups.includes(COMPLIANCE_OFFICER_GROUP) || cognitoGroups.includes(COMPLIANCE_OFFICER_GROUP);
}

function jsonResponse(statusCode: number, body: unknown): AuditHistoryResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/**
 * `GET /audit/claims/{claimId}` handler.
 *
 * - Returns 403 without querying the repository if the requester lacks the
 *   compliance-officer group claim (Requirement 8.5).
 * - Returns 400 without querying the repository if no `claimId` path
 *   parameter is present (malformed request; never reaches the repository
 *   either).
 * - Otherwise queries `repository.queryAuditLogByClaimId(claimId)` and
 *   returns 200 with the (possibly empty) chronologically-ordered records
 *   (Requirement 8.4).
 * - Returns 500 if the repository query fails, rather than letting the
 *   error propagate unhandled.
 */
export async function getAuditHistoryHandler(
  event: AuditHistoryRequestEvent,
  repository: AuditLogRepository,
): Promise<AuditHistoryResponse> {
  if (!isComplianceOfficer(event.requestContext.authorizer)) {
    return jsonResponse(403, { message: 'Forbidden: compliance-officer authorization is required.' });
  }

  const claimId = event.pathParameters?.claimId;
  if (!claimId) {
    return jsonResponse(400, { message: 'Missing required path parameter: claimId.' });
  }

  try {
    const records: AuditLogRecord[] = await repository.queryAuditLogByClaimId(claimId);
    return jsonResponse(200, { records });
  } catch (error) {
    const message = error instanceof AuditLogAccessError ? error.message : 'Failed to retrieve audit history.';
    return jsonResponse(500, { message });
  }
}
