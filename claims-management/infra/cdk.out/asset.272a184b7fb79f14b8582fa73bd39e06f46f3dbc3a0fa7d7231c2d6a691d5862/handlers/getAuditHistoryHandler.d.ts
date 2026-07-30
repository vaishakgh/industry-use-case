import { type AuditLogRepository } from '../repository/auditLogRepository';
/** The Cognito group name that grants audit-history read access. */
export declare const COMPLIANCE_OFFICER_GROUP = "ComplianceOfficer";
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
    pathParameters?: {
        claimId?: string | null;
    } | null;
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
/**
 * Determines whether the requester carries the compliance-officer group
 * claim, per the `AuditHistoryAuthorizerContext` shape documented above.
 */
export declare function isComplianceOfficer(authorizer: AuditHistoryAuthorizerContext | null | undefined): boolean;
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
export declare function getAuditHistoryHandler(event: AuditHistoryRequestEvent, repository: AuditLogRepository): Promise<AuditHistoryResponse>;
//# sourceMappingURL=getAuditHistoryHandler.d.ts.map