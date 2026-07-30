/**
 * Unit tests for the clarification engine.
 */
import type { StructuredClaimFields } from '@claims/shared';
import {
  areAllFieldsResolved,
  isFieldResolved,
  getNextClarificationAction,
  applyFieldValue,
  confirmFieldValue,
  rejectFieldValue,
  type FieldAttemptState,
  type ClarificationConfig,
} from './clarificationEngine';

const DEFAULT_CONFIG: ClarificationConfig = {
  fieldConfidenceThreshold: 0.75,
  maxClarifyingAttempts: 3,
  maxConfirmAttempts: 3,
};

const EMPTY_ATTEMPTS: FieldAttemptState = {
  clarifyAttempts: {},
  confirmAttempts: {},
};

function emptyFields(): StructuredClaimFields {
  return {
    policyNumber: { value: null, confidenceScore: null, confirmed: false },
    incidentDate: { value: null, confidenceScore: null, confirmed: false },
    incidentLocation: { value: null, confidenceScore: null, confirmed: false },
    damageDescription: { value: null, confidenceScore: null, confirmed: false },
  };
}

describe('isFieldResolved', () => {
  it('returns false for null value', () => {
    expect(isFieldResolved({ value: null, confidenceScore: null, confirmed: false }, 0.75)).toBe(false);
  });

  it('returns true when confirmed regardless of confidence', () => {
    expect(isFieldResolved({ value: 'test', confidenceScore: 0.1, confirmed: true }, 0.75)).toBe(true);
  });

  it('returns true when confidence >= threshold', () => {
    expect(isFieldResolved({ value: 'test', confidenceScore: 0.75, confirmed: false }, 0.75)).toBe(true);
    expect(isFieldResolved({ value: 'test', confidenceScore: 0.9, confirmed: false }, 0.75)).toBe(true);
  });

  it('returns false when confidence < threshold and not confirmed', () => {
    expect(isFieldResolved({ value: 'test', confidenceScore: 0.5, confirmed: false }, 0.75)).toBe(false);
  });
});

describe('areAllFieldsResolved', () => {
  it('returns false when any field has null value', () => {
    const fields = emptyFields();
    expect(areAllFieldsResolved(fields, 0.75)).toBe(false);
  });

  it('returns true when all fields are confirmed', () => {
    const fields: StructuredClaimFields = {
      policyNumber: { value: 'POL-123', confidenceScore: 0.5, confirmed: true },
      incidentDate: { value: '2024-01-01', confidenceScore: 0.5, confirmed: true },
      incidentLocation: { value: 'Main St', confidenceScore: 0.5, confirmed: true },
      damageDescription: { value: 'Dent on door', confidenceScore: 0.5, confirmed: true },
    };
    expect(areAllFieldsResolved(fields, 0.75)).toBe(true);
  });

  it('returns true when all fields have confidence >= threshold', () => {
    const fields: StructuredClaimFields = {
      policyNumber: { value: 'POL-123', confidenceScore: 0.8, confirmed: false },
      incidentDate: { value: '2024-01-01', confidenceScore: 0.9, confirmed: false },
      incidentLocation: { value: 'Main St', confidenceScore: 0.75, confirmed: false },
      damageDescription: { value: 'Dent on door', confidenceScore: 0.85, confirmed: false },
    };
    expect(areAllFieldsResolved(fields, 0.75)).toBe(true);
  });
});

describe('getNextClarificationAction', () => {
  it('returns transition_to_assessment when all fields resolved', () => {
    const fields: StructuredClaimFields = {
      policyNumber: { value: 'POL-123', confidenceScore: 0.8, confirmed: false },
      incidentDate: { value: '2024-01-01', confidenceScore: 0.9, confirmed: false },
      incidentLocation: { value: 'Main St', confidenceScore: 0.75, confirmed: false },
      damageDescription: { value: 'Dent', confidenceScore: 0.85, confirmed: false },
    };
    const action = getNextClarificationAction(fields, EMPTY_ATTEMPTS, DEFAULT_CONFIG);
    expect(action.type).toBe('transition_to_assessment');
  });

  it('returns clarify for the first field with null value', () => {
    const fields = emptyFields();
    const action = getNextClarificationAction(fields, EMPTY_ATTEMPTS, DEFAULT_CONFIG);
    expect(action.type).toBe('clarify');
    if (action.type === 'clarify') {
      expect(action.fieldName).toBe('policyNumber');
      expect(action.attemptNumber).toBe(1);
    }
  });

  it('returns confirm for a field with value below threshold', () => {
    const fields: StructuredClaimFields = {
      policyNumber: { value: 'POL-123', confidenceScore: 0.5, confirmed: false },
      incidentDate: { value: null, confidenceScore: null, confirmed: false },
      incidentLocation: { value: null, confidenceScore: null, confirmed: false },
      damageDescription: { value: null, confidenceScore: null, confirmed: false },
    };
    const action = getNextClarificationAction(fields, EMPTY_ATTEMPTS, DEFAULT_CONFIG);
    expect(action.type).toBe('confirm');
    if (action.type === 'confirm') {
      expect(action.fieldName).toBe('policyNumber');
      expect(action.value).toBe('POL-123');
    }
  });

  it('returns escalate when clarify attempts exhausted', () => {
    const fields = emptyFields();
    const state: FieldAttemptState = {
      clarifyAttempts: { policyNumber: 3 },
      confirmAttempts: {},
    };
    const action = getNextClarificationAction(fields, state, DEFAULT_CONFIG);
    expect(action.type).toBe('escalate');
    if (action.type === 'escalate') {
      expect(action.reason).toBe('clarification_exhausted');
      expect(action.fieldName).toBe('policyNumber');
    }
  });

  it('returns escalate when confirm attempts exhausted', () => {
    const fields: StructuredClaimFields = {
      policyNumber: { value: 'POL-123', confidenceScore: 0.5, confirmed: false },
      incidentDate: { value: null, confidenceScore: null, confirmed: false },
      incidentLocation: { value: null, confidenceScore: null, confirmed: false },
      damageDescription: { value: null, confidenceScore: null, confirmed: false },
    };
    const state: FieldAttemptState = {
      clarifyAttempts: {},
      confirmAttempts: { policyNumber: 3 },
    };
    const action = getNextClarificationAction(fields, state, DEFAULT_CONFIG);
    expect(action.type).toBe('escalate');
    if (action.type === 'escalate') {
      expect(action.reason).toBe('confirmation_exhausted');
      expect(action.fieldName).toBe('policyNumber');
    }
  });

  it('skips resolved fields and acts on the first unresolved one', () => {
    const fields: StructuredClaimFields = {
      policyNumber: { value: 'POL-123', confidenceScore: 0.9, confirmed: false }, // resolved
      incidentDate: { value: '2024-01-01', confidenceScore: 0.8, confirmed: false }, // resolved
      incidentLocation: { value: null, confidenceScore: null, confirmed: false }, // unresolved
      damageDescription: { value: null, confidenceScore: null, confirmed: false }, // unresolved
    };
    const action = getNextClarificationAction(fields, EMPTY_ATTEMPTS, DEFAULT_CONFIG);
    expect(action.type).toBe('clarify');
    if (action.type === 'clarify') {
      expect(action.fieldName).toBe('incidentLocation');
    }
  });
});

describe('applyFieldValue', () => {
  it('sets the value and confidence for the specified field', () => {
    const fields = emptyFields();
    const result = applyFieldValue(fields, 'policyNumber', 'POL-456', 0.9, false);
    expect(result.policyNumber).toEqual({ value: 'POL-456', confidenceScore: 0.9, confirmed: false });
    // Other fields unchanged
    expect(result.incidentDate).toEqual(fields.incidentDate);
  });

  it('can set confirmed to true', () => {
    const fields = emptyFields();
    const result = applyFieldValue(fields, 'incidentDate', '2024-03-15', 0.6, true);
    expect(result.incidentDate.confirmed).toBe(true);
  });
});

describe('confirmFieldValue', () => {
  it('marks an existing field as confirmed', () => {
    const fields: StructuredClaimFields = {
      ...emptyFields(),
      policyNumber: { value: 'POL-123', confidenceScore: 0.5, confirmed: false },
    };
    const result = confirmFieldValue(fields, 'policyNumber');
    expect(result.policyNumber.confirmed).toBe(true);
    expect(result.policyNumber.value).toBe('POL-123');
    expect(result.policyNumber.confidenceScore).toBe(0.5);
  });
});

describe('rejectFieldValue', () => {
  it('resets a field to null/unresolved state', () => {
    const fields: StructuredClaimFields = {
      ...emptyFields(),
      policyNumber: { value: 'POL-123', confidenceScore: 0.5, confirmed: false },
    };
    const result = rejectFieldValue(fields, 'policyNumber');
    expect(result.policyNumber).toEqual({ value: null, confidenceScore: null, confirmed: false });
  });

  it('does not affect other fields', () => {
    const fields: StructuredClaimFields = {
      policyNumber: { value: 'POL-123', confidenceScore: 0.5, confirmed: false },
      incidentDate: { value: '2024-01-01', confidenceScore: 0.9, confirmed: true },
      incidentLocation: { value: null, confidenceScore: null, confirmed: false },
      damageDescription: { value: null, confidenceScore: null, confirmed: false },
    };
    const result = rejectFieldValue(fields, 'policyNumber');
    expect(result.incidentDate).toEqual(fields.incidentDate);
    expect(result.incidentLocation).toEqual(fields.incidentLocation);
  });
});
