import type {
  Claim,
  ClaimSession,
  AuditLogRecord,
  DisputeRecord,
  StructuredClaimFields,
} from './models';

/**
 * These tests exist primarily to pin the *shape* of the shared domain
 * models against the design document's Data Models section. Because
 * TypeScript types have no runtime representation, each test constructs a
 * minimal, fully-typed literal for the model and asserts on its fields —
 * if a required field is renamed or removed, the literal below will fail
 * to type-check (surfaced as a build/test failure), and the runtime
 * assertions confirm the field names line up with the design doc exactly.
 */

function buildStructuredFields(): StructuredClaimFields {
  return {
    policyNumber: { value: 'POL-123', confidenceScore: 0.95, confirmed: true },
    incidentDate: { value: '2024-01-01', confidenceScore: 0.9, confirmed: true },
    incidentLocation: { value: '123 Main St', confidenceScore: 0.8, confirmed: false },
    damageDescription: { value: 'Cracked windshield', confidenceScore: 0.7, confirmed: false },
  };
}

function buildClaim(): Claim {
  return {
    claimId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    policyNumber: 'POL-123',
    claimStatus: 'Intake',
    structuredFields: buildStructuredFields(),
    originalChannel: 'Chat',
    photoRefs: [],
    documentRefs: [],
    severityRating: null,
    estimatedRepairCost: null,
    damageAssessmentConfidence: null,
    photoResubmissionCount: 0,
    fraudFlag: false,
    fraudIndicators: [],
    statusHistory: [{ status: 'Intake', timestamp: '2024-01-01T00:00:00.000Z' }],
    adjusterId: null,
    fraudAnalystId: null,
    dispute: null,
    policyholderIds: ['customer-1'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

function buildClaimSession(): ClaimSession {
  return {
    claimId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    policyNumber: 'POL-123',
    claimStatus: 'Intake',
    channelHistory: [{ channel: 'Chat', timestamp: '2024-01-01T00:00:00.000Z' }],
    fieldAttemptCounts: { policyNumber: 0 },
    voiceRetryCount: 0,
    confirmAttemptCounts: { incidentDate: 1 },
    expiresAt: 1735689600,
  };
}

function buildAuditLogRecord(): AuditLogRecord {
  return {
    logId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
    claimId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    decisionType: 'FraudFlag',
    inputs: { fraudIndicators: ['frequency'] },
    confidenceScore: 0.87,
    fraudIndicators: [{ type: 'frequency', confidenceScore: 0.87, detectedAt: '2024-01-01T00:00:00.000Z' }],
    timestamp: '2024-01-01T00:00:00.000Z',
    actorType: 'System',
    actorId: null,
  };
}

function buildDisputeRecord(): DisputeRecord {
  return {
    reason: 'The estimated repair cost is too low.',
    submittedAt: '2024-01-02T00:00:00.000Z',
    originalDecision: 'Approved',
    revisedDecision: null,
    resolvedByAdjusterId: null,
  };
}

describe('Claim', () => {
  it('accepts a fully-typed literal covering every Data Models field', () => {
    const claim = buildClaim();
    expect(claim.claimId).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(claim.claimStatus).toBe('Intake');
    expect(claim.structuredFields.policyNumber.value).toBe('POL-123');
    expect(claim.statusHistory).toHaveLength(1);
    expect(claim.policyholderIds).toContain('customer-1');
  });

  it('allows severityRating, estimatedRepairCost, and damageAssessmentConfidence to be null', () => {
    const claim = buildClaim();
    expect(claim.severityRating).toBeNull();
    expect(claim.estimatedRepairCost).toBeNull();
    expect(claim.damageAssessmentConfidence).toBeNull();
  });
});

describe('ClaimSession', () => {
  it('accepts a fully-typed literal covering every Data Models field', () => {
    const session = buildClaimSession();
    expect(session.claimId).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(session.claimStatus).toBe('Intake');
    expect(session.fieldAttemptCounts.policyNumber).toBe(0);
    expect(session.confirmAttemptCounts.incidentDate).toBe(1);
  });

  it('allows policyNumber to be null (unresolved session)', () => {
    const session: ClaimSession = { ...buildClaimSession(), policyNumber: null };
    expect(session.policyNumber).toBeNull();
  });
});

describe('AuditLogRecord', () => {
  it('accepts a fully-typed literal covering every Data Models field', () => {
    const record = buildAuditLogRecord();
    expect(record.decisionType).toBe('FraudFlag');
    expect(record.fraudIndicators).toHaveLength(1);
    expect(record.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(record.confidenceScore).toBeLessThanOrEqual(1);
  });

  it('allows confidenceScore and fraudIndicators to be null', () => {
    const record: AuditLogRecord = { ...buildAuditLogRecord(), confidenceScore: null, fraudIndicators: null };
    expect(record.confidenceScore).toBeNull();
    expect(record.fraudIndicators).toBeNull();
  });
});

describe('DisputeRecord', () => {
  it('accepts a fully-typed literal covering every Data Models field', () => {
    const dispute = buildDisputeRecord();
    expect(dispute.originalDecision).toBe('Approved');
    expect(dispute.revisedDecision).toBeNull();
    expect(dispute.resolvedByAdjusterId).toBeNull();
  });

  it('restricts originalDecision/revisedDecision to Approved | Denied', () => {
    const resolved: DisputeRecord = { ...buildDisputeRecord(), revisedDecision: 'Denied', resolvedByAdjusterId: 'adjuster-1' };
    expect(resolved.revisedDecision).toBe('Denied');
  });
});
