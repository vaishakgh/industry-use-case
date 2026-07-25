import {
  CLAIM_STATUS_VALUES,
  SEVERITY_RATING_VALUES,
  DECISION_TYPE_VALUES,
  ROLE_VALUES,
  ACTOR_TYPE_VALUES,
  CHANNEL_VALUES,
  STRUCTURED_FIELD_NAME_VALUES,
  DECISION_OUTCOME_VALUES,
  type ClaimStatus,
  type SeverityRating,
  type DecisionType,
  type Role,
  type ActorType,
  type Channel,
  type StructuredFieldName,
  type DecisionOutcome,
} from './enums';

describe('CLAIM_STATUS_VALUES', () => {
  it('contains exactly the nine lifecycle stages from the Glossary/Data Models', () => {
    expect(CLAIM_STATUS_VALUES).toEqual([
      'Intake',
      'Assessment',
      'Fraud_Check',
      'Pending_Adjuster_Review',
      'Approved',
      'Denied',
      'Paid',
      'Disputed',
      'Resolved',
    ]);
  });

  it('has no duplicate values', () => {
    expect(new Set(CLAIM_STATUS_VALUES).size).toBe(CLAIM_STATUS_VALUES.length);
  });

  it('type-checks a literal against the ClaimStatus union', () => {
    const status: ClaimStatus = 'Approved';
    expect(CLAIM_STATUS_VALUES).toContain(status);
  });
});

describe('SEVERITY_RATING_VALUES', () => {
  it('contains exactly Low, Medium, High', () => {
    expect(SEVERITY_RATING_VALUES).toEqual(['Low', 'Medium', 'High']);
  });

  it('type-checks a literal against the SeverityRating union', () => {
    const rating: SeverityRating = 'Medium';
    expect(SEVERITY_RATING_VALUES).toContain(rating);
  });
});

describe('DECISION_TYPE_VALUES', () => {
  it('contains exactly the decision types from AuditLogRecord.decisionType', () => {
    expect(DECISION_TYPE_VALUES).toEqual([
      'FieldExtraction',
      'DamageAssessment',
      'FraudFlag',
      'Approval',
      'Denial',
      'Payout',
      'DisputeResolution',
      'AccessDenied',
    ]);
  });

  it('has no duplicate values', () => {
    expect(new Set(DECISION_TYPE_VALUES).size).toBe(DECISION_TYPE_VALUES.length);
  });

  it('type-checks a literal against the DecisionType union', () => {
    const decisionType: DecisionType = 'FraudFlag';
    expect(DECISION_TYPE_VALUES).toContain(decisionType);
  });
});

describe('ROLE_VALUES', () => {
  it('contains exactly the four Cognito-group-backed roles', () => {
    expect(ROLE_VALUES).toEqual(['Customer', 'Human_Adjuster', 'Fraud_Analyst', 'ComplianceOfficer']);
  });

  it('type-checks a literal against the Role union', () => {
    const role: Role = 'Human_Adjuster';
    expect(ROLE_VALUES).toContain(role);
  });
});

describe('ACTOR_TYPE_VALUES', () => {
  it('contains exactly the four actor types from AuditLogRecord.actorType', () => {
    expect(ACTOR_TYPE_VALUES).toEqual(['System', 'HumanAdjuster', 'FraudAnalyst', 'Customer']);
  });

  it('type-checks a literal against the ActorType union', () => {
    const actorType: ActorType = 'System';
    expect(ACTOR_TYPE_VALUES).toContain(actorType);
  });
});

describe('CHANNEL_VALUES', () => {
  it('contains exactly Voice, Email, Chat', () => {
    expect(CHANNEL_VALUES).toEqual(['Voice', 'Email', 'Chat']);
  });

  it('type-checks a literal against the Channel union', () => {
    const channel: Channel = 'Voice';
    expect(CHANNEL_VALUES).toContain(channel);
  });
});

describe('STRUCTURED_FIELD_NAME_VALUES', () => {
  it('contains exactly the four required Structured_Claim_Fields', () => {
    expect(STRUCTURED_FIELD_NAME_VALUES).toEqual([
      'policyNumber',
      'incidentDate',
      'incidentLocation',
      'damageDescription',
    ]);
  });

  it('type-checks a literal against the StructuredFieldName union', () => {
    const field: StructuredFieldName = 'damageDescription';
    expect(STRUCTURED_FIELD_NAME_VALUES).toContain(field);
  });
});

describe('DECISION_OUTCOME_VALUES', () => {
  it('contains exactly Approved, Denied', () => {
    expect(DECISION_OUTCOME_VALUES).toEqual(['Approved', 'Denied']);
  });

  it('type-checks a literal against the DecisionOutcome union', () => {
    const outcome: DecisionOutcome = 'Denied';
    expect(DECISION_OUTCOME_VALUES).toContain(outcome);
  });
});
