"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidTransitionError = exports.VALID_TRANSITIONS = void 0;
exports.isValidTransition = isValidTransition;
exports.computeStatusSequence = computeStatusSequence;
/**
 * The set of valid transitions. For each status, lists the statuses it
 * may transition to.
 */
exports.VALID_TRANSITIONS = {
    Intake: ['Assessment'],
    Assessment: ['Fraud_Check', 'Pending_Adjuster_Review'],
    Fraud_Check: ['Approved', 'Denied', 'Pending_Adjuster_Review'],
    Pending_Adjuster_Review: ['Approved', 'Denied'],
    Approved: ['Paid', 'Disputed'],
    Denied: ['Disputed'],
    Paid: [],
    Disputed: ['Resolved'],
    Resolved: [],
};
/** Error thrown when a lifecycle transition is invalid. */
class InvalidTransitionError extends Error {
    from;
    to;
    constructor(from, to) {
        super(`Invalid lifecycle transition: ${from} → ${to}`);
        this.from = from;
        this.to = to;
        this.name = 'InvalidTransitionError';
    }
}
exports.InvalidTransitionError = InvalidTransitionError;
/**
 * Checks whether a transition from `from` to `to` is valid per the
 * lifecycle graph.
 */
function isValidTransition(from, to) {
    return exports.VALID_TRANSITIONS[from].includes(to);
}
/**
 * Given a sequence of stage-completion events (status transitions),
 * starting from an initial status, computes the resulting status sequence
 * and throws `InvalidTransitionError` if any transition is not permitted.
 *
 * @param initialStatus The claim's starting status
 * @param transitions The ordered sequence of target statuses to transition through
 * @returns The full status history including the initial status
 * @throws InvalidTransitionError if any transition is invalid
 */
function computeStatusSequence(initialStatus, transitions) {
    const sequence = [initialStatus];
    let current = initialStatus;
    for (const next of transitions) {
        if (!isValidTransition(current, next)) {
            throw new InvalidTransitionError(current, next);
        }
        sequence.push(next);
        current = next;
    }
    return sequence;
}
//# sourceMappingURL=lifecycleGraph.js.map