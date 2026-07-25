import type { AuditLogRecord } from '@claims/shared';
import { AuditLogAccessError, type AuditLogRepository } from '../repository/auditLogRepository';
import {
  COMPLIANCE_OFFICER_GROUP,
  getAuditHistoryHandler,
  isComplianceOfficer,
  type AuditHistoryRequestEvent,
} from './getAuditHistoryHandler';

function buildRecord(overrides: Partial<AuditLogRecord> = {}): AuditLogRecord {
  return {
    logId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
    claimId: 'claim-1',
    decisionType: 'Approval',
    inputs: { severityRating: 'Low' },
    confidenceScore: 0.9,
    fraudIndicators: null,
    timestamp: '2024-01-01T00:00:00.000Z',
    actorType: 'System',
    actorId: null,
    ...overrides,
  };
}

function buildRepository(records: AuditLogRecord[] = []): AuditLogRepository & {
  queryAuditLogByClaimId: jest.Mock;
} {
  return {
    putAuditLogRecord: jest.fn(async () => {}),
    queryAuditLogByClaimId: jest.fn(async () => records),
  };
}

function buildEvent(overrides: Partial<AuditHistoryRequestEvent> = {}): AuditHistoryRequestEvent {
  return {
    pathParameters: { claimId: 'claim-1' },
    requestContext: {
      authorizer: { groups: [COMPLIANCE_OFFICER_GROUP] },
    },
    ...overrides,
  };
}

describe('isComplianceOfficer', () => {
  it('returns true when the groups array contains ComplianceOfficer', () => {
    expect(isComplianceOfficer({ groups: ['ComplianceOfficer'] })).toBe(true);
  });

  it('returns true when groups is a comma-separated string containing ComplianceOfficer', () => {
    expect(isComplianceOfficer({ groups: 'Human_Adjuster,ComplianceOfficer' })).toBe(true);
  });

  it('returns true when the cognito:groups claim contains ComplianceOfficer', () => {
    expect(isComplianceOfficer({ claims: { 'cognito:groups': ['ComplianceOfficer'] } })).toBe(true);
  });

  it('returns false when no group matches', () => {
    expect(isComplianceOfficer({ groups: ['Human_Adjuster'] })).toBe(false);
  });

  it('returns false when the authorizer context is missing', () => {
    expect(isComplianceOfficer(null)).toBe(false);
    expect(isComplianceOfficer(undefined)).toBe(false);
  });
});

describe('getAuditHistoryHandler', () => {
  it('returns 200 with chronologically-ordered records for an authorized compliance-officer request', async () => {
    const records = [
      buildRecord({ logId: '01A', timestamp: '2024-01-01T00:00:00.000Z' }),
      buildRecord({ logId: '01B', timestamp: '2024-01-02T00:00:00.000Z' }),
    ];
    const repository = buildRepository(records);
    const event = buildEvent();

    const result = await getAuditHistoryHandler(event, repository);

    expect(result.statusCode).toBe(200);
    expect(repository.queryAuditLogByClaimId).toHaveBeenCalledWith('claim-1');
    expect(JSON.parse(result.body)).toEqual({ records });
  });

  it('returns 200 with an empty array for an authorized request for a claim with no records', async () => {
    const repository = buildRepository([]);
    const event = buildEvent();

    const result = await getAuditHistoryHandler(event, repository);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ records: [] });
  });

  it('returns 403 without calling the repository for an unauthorized request (missing group claim)', async () => {
    const repository = buildRepository([buildRecord()]);
    const event = buildEvent({ requestContext: { authorizer: null } });

    const result = await getAuditHistoryHandler(event, repository);

    expect(result.statusCode).toBe(403);
    expect(repository.queryAuditLogByClaimId).not.toHaveBeenCalled();
  });

  it('returns 403 without calling the repository for a request with the wrong group claim', async () => {
    const repository = buildRepository([buildRecord()]);
    const event = buildEvent({ requestContext: { authorizer: { groups: ['Human_Adjuster'] } } });

    const result = await getAuditHistoryHandler(event, repository);

    expect(result.statusCode).toBe(403);
    expect(repository.queryAuditLogByClaimId).not.toHaveBeenCalled();
  });

  it('returns 500 when the repository query fails, rather than throwing unhandled', async () => {
    const repository: AuditLogRepository = {
      putAuditLogRecord: jest.fn(async () => {}),
      queryAuditLogByClaimId: jest.fn(async () => {
        throw new AuditLogAccessError('query failed');
      }),
    };
    const event = buildEvent();

    const result = await getAuditHistoryHandler(event, repository);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('query failed');
  });

  it('returns 400 without calling the repository when claimId is missing', async () => {
    const repository = buildRepository([buildRecord()]);
    const event = buildEvent({ pathParameters: {} });

    const result = await getAuditHistoryHandler(event, repository);

    expect(result.statusCode).toBe(400);
    expect(repository.queryAuditLogByClaimId).not.toHaveBeenCalled();
  });
});
