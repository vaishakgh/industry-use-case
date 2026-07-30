/**
 * Property-based tests for the clarification engine.
 *
 * Property 5: Confirmation attempt exhaustion routes to an adjuster
 * Property 7: Field clarification attempt lifecycle
 * Property 8: Below-threshold confidence requires confirmation
 * Property 9: All fields resolved transitions to Assessment
 * Property 10: Rejected value resets confirmation state
 *
 * _Requirements: 1.8, 2.3, 2.4, 2.5, 2.6, 2.7_
 */
import fc from 'fast-check';
import type {
  StructuredClaimFields,
  StructuredFieldValue,
  StructuredFieldName,
} from '@claims/shared';
import { STRUCTURED_FIELD_NAME_VALUES } from '@claims/shared';
import {
  areAllFieldsResolved,
  isFieldResolved,
  getNextClarificationAction,
  getNextActionForField,
  rejectFieldValue,
  confirmFieldValue,
  recordClarifyAttempt,
  recordConfirmAttempt,
  resetConfirmAttempts,
  type FieldAttemptState,
  type ClarificationConfig,
} from './clarificationEngine';

// ─── Arbitrary generators ────────────────────────────────────────────────────

const fieldNameArbitrary: fc.Arbitrary<StructuredFieldName> =
  fc.constantFrom(...STRUCTURED_FIELD_NAME_VALUES);

/** Config with reasonable bounds for property testing. */
const configArbitrary: fc.Arbitrary<ClarificationConfig> = fc.record({
  fieldConfidenceThreshold: fc.double({ min: 0.1, max: 0.99, noNaN: true }),
  maxClarifyingAttempts: fc.integer({ min: 1, max: 5 }),
  maxConfirmAttempts: fc.integer({ min: 1, max: 5 }),
});

/** A field value that is fully resolved (above threshold or confirmed). */
function resolvedFieldArbitrary(threshold: number): fc.Arbitrary<StructuredFieldValue> {
  return fc.oneof(
    // Confirmed (any confidence)
    fc.record({
      value: fc.string({ minLength: 1, maxLength: 30 }),
      confidenceScore: fc.double({ min: 0, max: 1, noNaN: true }),
      confirmed: fc.constant(true),
    }),
    // High confidence (at or above threshold)
    fc.record({
      value: fc.string({ minLength: 1, maxLength: 30 }),
      confidenceScore: fc.double({ min: threshold, max: 1, noNaN: true }),
      confirmed: fc.constant(false),
    }),
  );
}

/** A field value that is unresolved: no value or below-threshold. */
function unresolvedFieldArbitrary(threshold: number): fc.Arbitrary<StructuredFieldValue> {
  return fc.oneof(
    // No value extracted
    fc.constant({ value: null, confidenceScore: null, confirmed: false } as StructuredFieldValue),
    // Value exists but below threshold, not confirmed
    fc.record({
      value: fc.string({ minLength: 1, maxLength: 30 }),
      confidenceScore: fc.double({ min: 0, max: Math.max(0, threshold - 0.001), noNaN: true }),
      confirmed: fc.constant(false),
    }),
  );
}

/** All-resolved fields for a given threshold. */
function allResolvedFieldsArbitrary(threshold: number): fc.Arbitrary<StructuredClaimFields> {
  const resolved = resolvedFieldArbitrary(threshold);
  return fc.record({
    policyNumber: resolved,
    incidentDate: resolved,
    incidentLocation: resolved,
    damageDescription: resolved,
  });
}

/** Empty attempt state. */
const emptyAttemptState: FieldAttemptState = {
  clarifyAttempts: {},
  confirmAttempts: {},
};

// ─── Property tests ──────────────────────────────────────────────────────────

describe('clarificationEngine property tests', () => {
  // Feature: claims-management-fnol, Property 9: All fields resolved transitions to Assessment
  describe('Property 9: All fields resolved transitions to Assessment', () => {
    it('returns transition_to_assessment when all fields are resolved (above threshold or confirmed)', () => {
      fc.assert(
        fc.property(configArbitrary, (config) => {
          // Generate all-resolved fields for this config's threshold
          fc.assert(
            fc.property(allResolvedFieldsArbitrary(config.fieldConfidenceThreshold), (fields) => {
              const action = getNextClarificationAction(fields, emptyAttemptState, config);
              expect(action.type).toBe('transition_to_assessment');
            }),
            { numRuns: 25 },
          );
        }),
        { numRuns: 4 },
      );
    });

    it('areAllFieldsResolved returns true iff every field is resolved', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 0.99, noNaN: true }),
          (threshold) => {
            fc.assert(
              fc.property(allResolvedFieldsArbitrary(threshold), (fields) => {
                expect(areAllFieldsResolved(fields, threshold)).toBe(true);
              }),
              { numRuns: 25 },
            );
          },
        ),
        { numRuns: 4 },
      );
    });
  });

  // Feature: claims-management-fnol, Property 7: Field clarification attempt lifecycle
  describe('Property 7: Field clarification attempt lifecycle', () => {
    it('asks a clarifying question when field has no value and attempts < max, escalates when attempts >= max', () => {
      fc.assert(
        fc.property(fieldNameArbitrary, configArbitrary, (fieldName, config) => {
          const nullField: StructuredFieldValue = { value: null, confidenceScore: null, confirmed: false };

          // Under-limit: should ask clarifying question
          for (let i = 0; i < config.maxClarifyingAttempts; i++) {
            const state: FieldAttemptState = {
              clarifyAttempts: { [fieldName]: i },
              confirmAttempts: {},
            };
            const action = getNextActionForField(fieldName, nullField, state, config);
            expect(action.type).toBe('clarify');
            if (action.type === 'clarify') {
              expect(action.attemptNumber).toBe(i + 1);
            }
          }

          // At-limit: should escalate
          const exhaustedState: FieldAttemptState = {
            clarifyAttempts: { [fieldName]: config.maxClarifyingAttempts },
            confirmAttempts: {},
          };
          const escalation = getNextActionForField(fieldName, nullField, exhaustedState, config);
          expect(escalation.type).toBe('escalate');
          if (escalation.type === 'escalate') {
            expect(escalation.reason).toBe('clarification_exhausted');
            expect(escalation.fieldName).toBe(fieldName);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: claims-management-fnol, Property 8: Below-threshold confidence requires confirmation
  describe('Property 8: Below-threshold confidence requires confirmation', () => {
    it('requests confirmation when field has value but confidence < threshold', () => {
      fc.assert(
        fc.property(
          fieldNameArbitrary,
          configArbitrary,
          fc.string({ minLength: 1, maxLength: 30 }),
          (fieldName, config, value) => {
            // Generate a confidence strictly below threshold
            const confidence = config.fieldConfidenceThreshold * 0.5;
            const field: StructuredFieldValue = {
              value,
              confidenceScore: confidence,
              confirmed: false,
            };

            const action = getNextActionForField(fieldName, field, emptyAttemptState, config);
            expect(action.type).toBe('confirm');
            if (action.type === 'confirm') {
              expect(action.fieldName).toBe(fieldName);
              expect(action.value).toBe(value);
              expect(action.confidenceScore).toBe(confidence);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('does NOT request confirmation when confidence >= threshold (field is resolved)', () => {
      fc.assert(
        fc.property(
          fieldNameArbitrary,
          configArbitrary,
          fc.string({ minLength: 1, maxLength: 30 }),
          (fieldName, config, value) => {
            const field: StructuredFieldValue = {
              value,
              confidenceScore: config.fieldConfidenceThreshold, // exactly at threshold
              confirmed: false,
            };

            const resolved = isFieldResolved(field, config.fieldConfidenceThreshold);
            expect(resolved).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: claims-management-fnol, Property 5: Confirmation attempt exhaustion routes to an adjuster
  describe('Property 5: Confirmation attempt exhaustion routes to an adjuster', () => {
    it('escalates when confirm attempts reach the maximum', () => {
      fc.assert(
        fc.property(
          fieldNameArbitrary,
          configArbitrary,
          fc.string({ minLength: 1, maxLength: 30 }),
          (fieldName, config, value) => {
            const field: StructuredFieldValue = {
              value,
              confidenceScore: config.fieldConfidenceThreshold * 0.5, // below threshold
              confirmed: false,
            };

            const exhaustedState: FieldAttemptState = {
              clarifyAttempts: {},
              confirmAttempts: { [fieldName]: config.maxConfirmAttempts },
            };

            const action = getNextActionForField(fieldName, field, exhaustedState, config);
            expect(action.type).toBe('escalate');
            if (action.type === 'escalate') {
              expect(action.reason).toBe('confirmation_exhausted');
              expect(action.fieldName).toBe(fieldName);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: claims-management-fnol, Property 10: Rejected value resets confirmation state
  describe('Property 10: Rejected value resets confirmation state', () => {
    it('rejectFieldValue sets value to null, confidence to null, confirmed to false', () => {
      fc.assert(
        fc.property(
          fieldNameArbitrary,
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (fieldName, value, confidence) => {
            // Start with a field that has a value (was extracted but rejected)
            const fields: StructuredClaimFields = {
              policyNumber: { value: null, confidenceScore: null, confirmed: false },
              incidentDate: { value: null, confidenceScore: null, confirmed: false },
              incidentLocation: { value: null, confidenceScore: null, confirmed: false },
              damageDescription: { value: null, confidenceScore: null, confirmed: false },
              [fieldName]: { value, confidenceScore: confidence, confirmed: false },
            };

            const result = rejectFieldValue(fields, fieldName);

            // The rejected field must be fully reset
            expect(result[fieldName].value).toBeNull();
            expect(result[fieldName].confidenceScore).toBeNull();
            expect(result[fieldName].confirmed).toBe(false);

            // Other fields must be unchanged
            for (const otherField of STRUCTURED_FIELD_NAME_VALUES) {
              if (otherField !== fieldName) {
                expect(result[otherField]).toEqual(fields[otherField]);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('resetConfirmAttempts clears confirm attempt count for the rejected field', () => {
      fc.assert(
        fc.property(
          fieldNameArbitrary,
          fc.integer({ min: 1, max: 5 }),
          (fieldName, attempts) => {
            const state: FieldAttemptState = {
              clarifyAttempts: { [fieldName]: 2 },
              confirmAttempts: { [fieldName]: attempts },
            };

            const result = resetConfirmAttempts(state, fieldName);

            // Confirm attempts for the field must be cleared
            expect(result.confirmAttempts[fieldName]).toBeUndefined();
            // Clarify attempts must be preserved
            expect(result.clarifyAttempts[fieldName]).toBe(2);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('after rejection, the field requires fresh extraction (is not resolved)', () => {
      fc.assert(
        fc.property(
          fieldNameArbitrary,
          fc.double({ min: 0.1, max: 0.99, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (fieldName, threshold, value, confidence) => {
            const fields: StructuredClaimFields = {
              policyNumber: { value: null, confidenceScore: null, confirmed: false },
              incidentDate: { value: null, confidenceScore: null, confirmed: false },
              incidentLocation: { value: null, confidenceScore: null, confirmed: false },
              damageDescription: { value: null, confidenceScore: null, confirmed: false },
              [fieldName]: { value, confidenceScore: confidence, confirmed: false },
            };

            const rejected = rejectFieldValue(fields, fieldName);
            expect(isFieldResolved(rejected[fieldName], threshold)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

describe('confirmFieldValue', () => {
  it('marks the field as confirmed without changing its value or confidence', () => {
    fc.assert(
      fc.property(
        fieldNameArbitrary,
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (fieldName, value, confidence) => {
          const fields: StructuredClaimFields = {
            policyNumber: { value: null, confidenceScore: null, confirmed: false },
            incidentDate: { value: null, confidenceScore: null, confirmed: false },
            incidentLocation: { value: null, confidenceScore: null, confirmed: false },
            damageDescription: { value: null, confidenceScore: null, confirmed: false },
            [fieldName]: { value, confidenceScore: confidence, confirmed: false },
          };

          const result = confirmFieldValue(fields, fieldName);

          expect(result[fieldName].confirmed).toBe(true);
          expect(result[fieldName].value).toBe(value);
          expect(result[fieldName].confidenceScore).toBe(confidence);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('recordClarifyAttempt / recordConfirmAttempt', () => {
  it('increments the clarify counter for the specified field only', () => {
    fc.assert(
      fc.property(fieldNameArbitrary, fc.integer({ min: 0, max: 10 }), (fieldName, current) => {
        const state: FieldAttemptState = {
          clarifyAttempts: { [fieldName]: current },
          confirmAttempts: {},
        };
        const updated = recordClarifyAttempt(state, fieldName);
        expect(updated.clarifyAttempts[fieldName]).toBe(current + 1);
        expect(updated.confirmAttempts).toEqual({});
      }),
      { numRuns: 100 },
    );
  });

  it('increments the confirm counter for the specified field only', () => {
    fc.assert(
      fc.property(fieldNameArbitrary, fc.integer({ min: 0, max: 10 }), (fieldName, current) => {
        const state: FieldAttemptState = {
          clarifyAttempts: {},
          confirmAttempts: { [fieldName]: current },
        };
        const updated = recordConfirmAttempt(state, fieldName);
        expect(updated.confirmAttempts[fieldName]).toBe(current + 1);
        expect(updated.clarifyAttempts).toEqual({});
      }),
      { numRuns: 100 },
    );
  });
});
