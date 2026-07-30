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
import type { StructuredClaimFields, StructuredFieldName, StructuredFieldValue, ConfidenceScore } from '@claims/shared';
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
export type ClarificationAction = ClarifyAction | ConfirmAction | EscalateAction | TransitionAction;
/**
 * Determines whether a field is "resolved" — i.e., it has a value AND is
 * either confirmed or has confidence at/above threshold.
 */
export declare function isFieldResolved(field: StructuredFieldValue, fieldConfidenceThreshold: number): boolean;
/**
 * Checks whether all four structured fields are resolved.
 * _Requirements: 2.5_
 */
export declare function areAllFieldsResolved(fields: StructuredClaimFields, fieldConfidenceThreshold: number): boolean;
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
export declare function getNextActionForField(fieldName: StructuredFieldName, field: StructuredFieldValue, attemptState: FieldAttemptState, config: ClarificationConfig): ClarifyAction | ConfirmAction | EscalateAction;
/**
 * Main entry point: given the current fields and attempt state, returns
 * the next action the agent should take.
 *
 * Priority order:
 * 1. If all fields are resolved → transition to Assessment.
 * 2. Otherwise, pick the first unresolved field (in canonical order) and
 *    return the appropriate clarify/confirm/escalate action.
 */
export declare function getNextClarificationAction(fields: StructuredClaimFields, attemptState: FieldAttemptState, config: ClarificationConfig): ClarificationAction;
/**
 * Records a clarification attempt for a field.
 * Returns updated attempt state (immutable).
 */
export declare function recordClarifyAttempt(state: FieldAttemptState, fieldName: StructuredFieldName): FieldAttemptState;
/**
 * Records a confirmation attempt for a field.
 * Returns updated attempt state (immutable).
 */
export declare function recordConfirmAttempt(state: FieldAttemptState, fieldName: StructuredFieldName): FieldAttemptState;
/**
 * Applies an extracted/confirmed value to the structured fields.
 * Returns a new StructuredClaimFields (immutable).
 */
export declare function applyFieldValue(fields: StructuredClaimFields, fieldName: StructuredFieldName, value: string, confidenceScore: ConfidenceScore, confirmed: boolean): StructuredClaimFields;
/**
 * Handles a customer's confirmation of a field value.
 * Marks the field as confirmed. Returns updated fields.
 */
export declare function confirmFieldValue(fields: StructuredClaimFields, fieldName: StructuredFieldName): StructuredClaimFields;
/**
 * Handles a customer's rejection of a field value (Req 2.7).
 * Resets the field to unresolved state: value null, confidence null,
 * confirmed false. The field will need fresh extraction.
 *
 * Note: this does NOT reset the clarify attempt counter — it resets
 * the confirm attempt counter for the field since a rejection means the
 * value is being re-requested entirely.
 */
export declare function rejectFieldValue(fields: StructuredClaimFields, fieldName: StructuredFieldName): StructuredClaimFields;
/**
 * Resets confirmation attempts for a field after rejection.
 * The field needs fresh extraction, so confirm attempts restart.
 */
export declare function resetConfirmAttempts(state: FieldAttemptState, fieldName: StructuredFieldName): FieldAttemptState;
//# sourceMappingURL=clarificationEngine.d.ts.map