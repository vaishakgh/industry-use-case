/**
 * Clarification engine for structured field extraction.
 *
 * Manages the lifecycle of extracting, confirming, and clarifying
 * Structured_Claim_Fields during FNOL intake. This module implements:
 *
 * - Per-field clarification attempt counter with adjuster escalation
 *   (task 7.3 / Req 2.3, 2.6)
 * - Confidence-threshold confirmation and rejection re-request handling
 *   (task 7.5 / Req 2.4, 2.7)
 * - Confirm/restate attempt counter with adjuster escalation
 *   (task 7.8 / Req 1.8)
 * - All-fields-resolved transition to Assessment
 *   (task 7.10 / Req 2.5)
 *
 * The engine is stateless itself — it takes the current state and produces
 * the next state plus an action for the caller to perform.
 */
import type {
  StructuredClaimFields,
  StructuredFieldName,
  StructuredFieldValue,
  ConfidenceScore,
} from '@claims/shared';
import { STRUCTURED_FIELD_NAME_VALUES } from '@claims/shared';

// ─── State types ────────────────────────────────────────────────────────────

/**
 * Per-field attempt counts tracking how many times we've asked the customer
 * to clarify (provide) a field value, and how many times we've asked them
 * to confirm a low-confidence value.
 */
export interface FieldAttemptState {
  /** Number of clarifying questions asked for a field (Req 2.3: max 3). */
  clarifyAttempts: Partial<Record<StructuredFieldName, number>>;
  /** Number of confirm/restate attempts for a field (Req 1.8: max configurable). */
  confirmAttempts: Partial<Record<StructuredFieldName, number>>;
}

/** Configuration thresholds for the clarification engine. */
export interface ClarificationConfig {
  /** Minimum extraction confidence that does not require confirmation (Req 2.4). */
  fieldConfidenceThreshold: number;
  /** Maximum clarifying-question attempts per field (Req 2.3, 2.6). Default: 3. */
  maxClarifyingAttempts: number;
  /** Maximum confirm/restate attempts before routing to adjuster (Req 1.8). */
  maxConfirmAttempts: number;
}

// ─── Action types (what the engine tells the caller to do next) ─────────────

/** Ask the customer to provide a field that couldn't be extracted. */
export interface ClarifyAction {
  type: 'clarify';
  fieldName: StructuredFieldName;
  attemptNumber: number;
}

/** Ask the customer to confirm a low-confidence extracted value. */
export interface ConfirmAction {
  type: 'confirm';
  fieldName: StructuredFieldName;
  value: string;
  confidenceScore: ConfidenceScore;
  attemptNumber: number;
}

/** Route the claim to a human adjuster (clarification or confirmation exhausted). */
export interface EscalateAction {
  type: 'escalate';
  reason: 'clarification_exhausted' | 'confirmation_exhausted';
  fieldName: StructuredFieldName;
}

/** All fields are resolved — transition to Assessment. */
export interface TransitionAction {
  type: 'transition_to_assessment';
}

export type ClarificationAction =
  | ClarifyAction
  | ConfirmAction
  | EscalateAction
  | TransitionAction;

// ─── Core logic ─────────────────────────────────────────────────────────────

/**
 * Determines whether a field is "resolved" — i.e., it has a value AND is
 * either confirmed or has confidence at/above threshold.
 */
export function isFieldResolved(
  field: StructuredFieldValue,
  fieldConfidenceThreshold: number,
): boolean {
  if (field.value === null) return false;
  if (field.confirmed) return true;
  if (field.confidenceScore !== null && field.confidenceScore >= fieldConfidenceThreshold) return true;
  return false;
}

/**
 * Checks whether all four structured fields are resolved.
 * _Requirements: 2.5_
 */
export function areAllFieldsResolved(
  fields: StructuredClaimFields,
  fieldConfidenceThreshold: number,
): boolean {
  return STRUCTURED_FIELD_NAME_VALUES.every((name) =>
    isFieldResolved(fields[name], fieldConfidenceThreshold),
  );
}

/**
 * Determines the next action for a single unresolved field.
 *
 * Decision tree:
 * 1. If the field has no value → ask a clarifying question (increment counter).
 *    If counter >= max → escalate.
 * 2. If the field has a value but confidence < threshold and not confirmed →
 *    ask for confirmation (increment counter).
 *    If counter >= max → escalate.
 */
export function getNextActionForField(
  fieldName: StructuredFieldName,
  field: StructuredFieldValue,
  attemptState: FieldAttemptState,
  config: ClarificationConfig,
): ClarifyAction | ConfirmAction | EscalateAction {
  if (field.value === null || field.confidenceScore === null) {
    // No value extracted — need to clarify
    const attempts = attemptState.clarifyAttempts[fieldName] ?? 0;
    if (attempts >= config.maxClarifyingAttempts) {
      return { type: 'escalate', reason: 'clarification_exhausted', fieldName };
    }
    return { type: 'clarify', fieldName, attemptNumber: attempts + 1 };
  }

  // Value exists but below confidence threshold — need confirmation
  const confirmAttempts = attemptState.confirmAttempts[fieldName] ?? 0;
  if (confirmAttempts >= config.maxConfirmAttempts) {
    return { type: 'escalate', reason: 'confirmation_exhausted', fieldName };
  }
  return {
    type: 'confirm',
    fieldName,
    value: field.value,
    confidenceScore: field.confidenceScore,
    attemptNumber: confirmAttempts + 1,
  };
}

/**
 * Main entry point: given the current fields and attempt state, returns
 * the next action the agent should take.
 *
 * Priority order:
 * 1. If all fields are resolved → transition to Assessment.
 * 2. Otherwise, pick the first unresolved field (in canonical order) and
 *    return the appropriate clarify/confirm/escalate action.
 */
export function getNextClarificationAction(
  fields: StructuredClaimFields,
  attemptState: FieldAttemptState,
  config: ClarificationConfig,
): ClarificationAction {
  if (areAllFieldsResolved(fields, config.fieldConfidenceThreshold)) {
    return { type: 'transition_to_assessment' };
  }

  // Find first unresolved field in canonical order
  for (const fieldName of STRUCTURED_FIELD_NAME_VALUES) {
    const field = fields[fieldName];
    if (!isFieldResolved(field, config.fieldConfidenceThreshold)) {
      return getNextActionForField(fieldName, field, attemptState, config);
    }
  }

  // Should be unreachable given the areAllFieldsResolved check above
  return { type: 'transition_to_assessment' };
}

// ─── State mutation helpers ─────────────────────────────────────────────────

/**
 * Records a clarification attempt for a field.
 * Returns updated attempt state (immutable).
 */
export function recordClarifyAttempt(
  state: FieldAttemptState,
  fieldName: StructuredFieldName,
): FieldAttemptState {
  return {
    ...state,
    clarifyAttempts: {
      ...state.clarifyAttempts,
      [fieldName]: (state.clarifyAttempts[fieldName] ?? 0) + 1,
    },
  };
}

/**
 * Records a confirmation attempt for a field.
 * Returns updated attempt state (immutable).
 */
export function recordConfirmAttempt(
  state: FieldAttemptState,
  fieldName: StructuredFieldName,
): FieldAttemptState {
  return {
    ...state,
    confirmAttempts: {
      ...state.confirmAttempts,
      [fieldName]: (state.confirmAttempts[fieldName] ?? 0) + 1,
    },
  };
}

/**
 * Applies an extracted/confirmed value to the structured fields.
 * Returns a new StructuredClaimFields (immutable).
 */
export function applyFieldValue(
  fields: StructuredClaimFields,
  fieldName: StructuredFieldName,
  value: string,
  confidenceScore: ConfidenceScore,
  confirmed: boolean,
): StructuredClaimFields {
  return {
    ...fields,
    [fieldName]: { value, confidenceScore, confirmed },
  };
}

/**
 * Handles a customer's confirmation of a field value.
 * Marks the field as confirmed. Returns updated fields.
 */
export function confirmFieldValue(
  fields: StructuredClaimFields,
  fieldName: StructuredFieldName,
): StructuredClaimFields {
  const current = fields[fieldName];
  return {
    ...fields,
    [fieldName]: { ...current, confirmed: true },
  };
}

/**
 * Handles a customer's rejection of a field value (Req 2.7).
 * Resets the field to unresolved state: value null, confidence null,
 * confirmed false. The field will need fresh extraction.
 *
 * Note: this does NOT reset the clarify attempt counter — it resets
 * the confirm attempt counter for the field since a rejection means the
 * value is being re-requested entirely.
 */
export function rejectFieldValue(
  fields: StructuredClaimFields,
  fieldName: StructuredFieldName,
): StructuredClaimFields {
  return {
    ...fields,
    [fieldName]: { value: null, confidenceScore: null, confirmed: false },
  };
}

/**
 * Resets confirmation attempts for a field after rejection.
 * The field needs fresh extraction, so confirm attempts restart.
 */
export function resetConfirmAttempts(
  state: FieldAttemptState,
  fieldName: StructuredFieldName,
): FieldAttemptState {
  const { [fieldName]: _, ...rest } = state.confirmAttempts;
  return {
    ...state,
    confirmAttempts: rest,
  };
}
