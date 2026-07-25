/**
 * Property-based test for audit history access restriction.
 *
 * See design.md: Property 32: Audit history access restricted to
 * compliance officers.
 *
 * _Requirements: 8.5_
 */
import fc from 'fast-check';
import type { AuditLogRecord } from '@claims/shared';
import type { AuditLogRepository } from '../repository/auditLogRepository';
import {
  COMPLIANCE_OFFICER_GROUP,
  getAuditHistoryHandler,
  type AuditHistoryAuthorizerContext,
  type AuditHistoryRequestEvent,
} from './getAuditHistoryHandler';

/** A fixed, valid record returned by the repository when it is queried. */
const RECORD: AuditLogRecord = {
  logId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
  claimId: 'claim-1',
  decisionType: 'Approval',
  inputs: { severityRating: 'Low' },
  confidenceScore: 0.9,
  fraudIndicators: null,
  timestamp: '2024-01-01T00:00:00.000Z',
  actorType: 'System',
  actorId: null,
};

/**
 * A fake repository that always succeeds with a single record, and tracks
 * whether/how many times it was queried.
 */
class FakeAuditLogRepository implements AuditLogRepository {
  public callCount = 0;

  async putAuditLogRecord(): Promise<void> {}

  async queryAuditLogByClaimId(): Promise<AuditLogRecord[]> {
    this.callCount += 1;
    return [RECORD];
  }
}

/** Other, non-compliance-officer group names to mix into generated groups. */
const OTHER_GROUP_NAMES = ['Human_Adjuster', 'Fraud_Analyst', 'Customer', 'System', ''];

const groupNameArbitrary: fc.Arbitrary<string> = fc.oneof(
  fc.constant(COMPLIANCE_OFFICER_GROUP),
  fc.constantFrom(...OTHER_GROUP_NAMES),
  fc.string({ maxLength: 10 }),
);

/** An arbitrary array of group names (may or may not include ComplianceOfficer). */
const groupArrayArbitrary: fc.Arbitrary<string[]> = fc.array(groupNameArbitrary, { maxLength: 5 });

/**
 * Encodes an array of group names as either a real array or a
 * comma-separated string, per the two encodings the handler accepts.
 */
function encodeGroups(groups: string[]): fc.Arbitrary<string[] | string> {
  return fc.oneof(fc.constant(groups), fc.constant(groups.join(',')));
}

const encodedGroupsArbitrary: fc.Arbitrary<string[] | string | undefined> = groupArrayArbitrary.chain((groups) =>
  fc.oneof(encodeGroups(groups), fc.constant(undefined)),
);

/**
 * Arbitrary generator for an `AuditHistoryAuthorizerContext | null | undefined`,
 * covering:
 *  - null/undefined authorizer contexts (no authorizer ran / context absent)
 *  - a `groups` field, encoded as an array or comma-separated string,
 *    optionally containing 'ComplianceOfficer' in various positions
 *  - a `claims['cognito:groups']` field, encoded the same two ways
 *  - both fields present simultaneously, independently generated
 */
const authorizerContextArbitrary: fc.Arbitrary<AuditHistoryAuthorizerContext | null | undefined> = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.record({
    groups: encodedGroupsArbitrary,
    claims: fc.oneof(
      fc.constant(undefined),
      fc.record({ 'cognito:groups': encodedGroupsArbitrary }),
    ),
  }),
);

/**
 * Determines, per the property statement, whether a given authorizer
 * context is expected to be treated as compliance-officer-authorized: the
 * literal string 'ComplianceOfficer' must appear in the `groups` field or
 * the `claims['cognito:groups']` field, in either array or
 * comma-separated-string encoding.
 */
function containsComplianceOfficer(value: string[] | string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const list = Array.isArray(value) ? value : value.split(',').map((v) => v.trim());
  return list.includes(COMPLIANCE_OFFICER_GROUP);
}

function expectedAuthorized(authorizer: AuditHistoryAuthorizerContext | null | undefined): boolean {
  if (!authorizer) {
    return false;
  }
  return (
    containsComplianceOfficer(authorizer.groups) ||
    containsComplianceOfficer(authorizer.claims?.['cognito:groups'])
  );
}

function buildEvent(authorizer: AuditHistoryAuthorizerContext | null | undefined): AuditHistoryRequestEvent {
  return {
    pathParameters: { claimId: 'claim-1' },
    requestContext: { authorizer },
  };
}

describe('getAuditHistoryHandler property tests', () => {
  // Feature: claims-management-fnol, Property 32: Audit history access restricted to compliance officers
  it('returns 403 without querying the repository if and only if the authorizer context lacks ComplianceOfficer', async () => {
    await fc.assert(
      fc.asyncProperty(authorizerContextArbitrary, async (authorizer) => {
        const repository = new FakeAuditLogRepository();
        const event = buildEvent(authorizer);

        const result = await getAuditHistoryHandler(event, repository);

        const authorized = expectedAuthorized(authorizer);

        if (authorized) {
          expect(result.statusCode).not.toBe(403);
          expect(repository.callCount).toBe(1);
        } else {
          expect(result.statusCode).toBe(403);
          expect(repository.callCount).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
