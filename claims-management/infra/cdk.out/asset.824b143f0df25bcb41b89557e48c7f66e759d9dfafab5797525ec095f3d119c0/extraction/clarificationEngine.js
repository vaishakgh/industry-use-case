"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFieldResolved = isFieldResolved;
exports.areAllFieldsResolved = areAllFieldsResolved;
exports.getNextActionForField = getNextActionForField;
exports.getNextClarificationAction = getNextClarificationAction;
exports.recordClarifyAttempt = recordClarifyAttempt;
exports.recordConfirmAttempt = recordConfirmAttempt;
exports.applyFieldValue = applyFieldValue;
exports.confirmFieldValue = confirmFieldValue;
exports.rejectFieldValue = rejectFieldValue;
exports.resetConfirmAttempts = resetConfirmAttempts;
const shared_1 = require("@claims/shared");
// ─── Core logic ─────────────────────────────────────────────────────────────
/**
 * Determines whether a field is "resolved" — i.e., it has a value AND is
 * either confirmed or has confidence at/above threshold.
 */
function isFieldResolved(field, fieldConfidenceThreshold) {
    if (field.value === null)
        return false;
    if (field.confirmed)
        return true;
    if (field.confidenceScore !== null && field.confidenceScore >= fieldConfidenceThreshold)
        return true;
    return false;
}
/**
 * Checks whether all four structured fields are resolved.
 * _Requirements: 2.5_
 */
function areAllFieldsResolved(fields, fieldConfidenceThreshold) {
    return shared_1.STRUCTURED_FIELD_NAME_VALUES.every((name) => isFieldResolved(fields[name], fieldConfidenceThreshold));
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
function getNextActionForField(fieldName, field, attemptState, config) {
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
function getNextClarificationAction(fields, attemptState, config) {
    if (areAllFieldsResolved(fields, config.fieldConfidenceThreshold)) {
        return { type: 'transition_to_assessment' };
    }
    // Find first unresolved field in canonical order
    for (const fieldName of shared_1.STRUCTURED_FIELD_NAME_VALUES) {
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
function recordClarifyAttempt(state, fieldName) {
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
function recordConfirmAttempt(state, fieldName) {
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
function applyFieldValue(fields, fieldName, value, confidenceScore, confirmed) {
    return {
        ...fields,
        [fieldName]: { value, confidenceScore, confirmed },
    };
}
/**
 * Handles a customer's confirmation of a field value.
 * Marks the field as confirmed. Returns updated fields.
 */
function confirmFieldValue(fields, fieldName) {
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
function rejectFieldValue(fields, fieldName) {
    return {
        ...fields,
        [fieldName]: { value: null, confidenceScore: null, confirmed: false },
    };
}
/**
 * Resets confirmation attempts for a field after rejection.
 * The field needs fresh extraction, so confirm attempts restart.
 */
function resetConfirmAttempts(state, fieldName) {
    const { [fieldName]: _, ...rest } = state.confirmAttempts;
    return {
        ...state,
        confirmAttempts: rest,
    };
}
//# sourceMappingURL=clarificationEngine.js.map