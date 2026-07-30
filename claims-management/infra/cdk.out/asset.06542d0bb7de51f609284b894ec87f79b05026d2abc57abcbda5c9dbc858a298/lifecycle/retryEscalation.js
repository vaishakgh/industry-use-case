"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyFailure = classifyFailure;
exports.evaluateRetryDecision = evaluateRetryDecision;
/**
 * Known transient error patterns. A real implementation would match on
 * AWS SDK error codes (ThrottlingException, ServiceUnavailableException,
 * RequestTimeout, etc.).
 */
const TRANSIENT_ERROR_PATTERNS = [
    'ThrottlingException',
    'ServiceUnavailableException',
    'RequestTimeout',
    'TooManyRequestsException',
    'InternalServerError',
];
/**
 * Classifies a stage failure as transient or persistent based on the
 * error name/type.
 */
function classifyFailure(errorName, message) {
    const isTransient = TRANSIENT_ERROR_PATTERNS.some((pattern) => errorName.includes(pattern) || message.includes(pattern));
    return {
        type: isTransient ? 'TransientFailure' : 'PersistentFailure',
        errorName,
        message,
    };
}
/**
 * Evaluates whether to retry or escalate given the failure classification
 * and current attempt count.
 *
 * Decision logic:
 * - Persistent failure → immediate escalation (Req 7.3)
 * - Transient failure + attempts < max → retry with backoff (Req 7.2)
 * - Transient failure + attempts >= max → escalate (Req 7.2, 7.3)
 *
 * Backoff is a simple fixed-interval scheme: attemptNumber * backoffSeconds.
 */
function evaluateRetryDecision(classification, currentAttempt, config) {
    if (classification.type === 'PersistentFailure') {
        return {
            action: 'escalate',
            reason: `Persistent failure (${classification.errorName}): ${classification.message}`,
        };
    }
    // Transient failure
    if (currentAttempt >= config.stageRetryMaxAttempts) {
        return {
            action: 'escalate',
            reason: `Transient failure retry attempts exhausted (${currentAttempt}/${config.stageRetryMaxAttempts}): ${classification.errorName}`,
        };
    }
    const backoffMs = (currentAttempt + 1) * config.stageRetryBackoffSeconds * 1000;
    return {
        action: 'retry',
        attemptNumber: currentAttempt + 1,
        backoffMs,
    };
}
//# sourceMappingURL=retryEscalation.js.map