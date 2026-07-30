"use strict";
/**
 * PreAuthentication Lambda trigger for lockout tracking.
 *
 * Tracks consecutive failed attempts per account and denies attempts
 * once 5 consecutive failures occur within 15 minutes, until lockout expires.
 *
 * _Requirements: 9.3_
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOCKOUT_CONFIG = void 0;
exports.checkLockout = checkLockout;
exports.recordFailedAttempt = recordFailedAttempt;
exports.DEFAULT_LOCKOUT_CONFIG = {
    maxConsecutiveFailures: 5,
    lockoutWindowMs: 15 * 60 * 1000, // 15 minutes
};
/**
 * Checks if an account is locked out.
 */
function checkLockout(record, config, now = Date.now()) {
    if (!record)
        return { locked: false };
    // Check if lockout window has expired
    if (now - record.lastFailureAt > config.lockoutWindowMs) {
        return { locked: false };
    }
    // Check if max failures reached
    if (record.consecutiveFailures >= config.maxConsecutiveFailures) {
        const unlocksAt = record.lastFailureAt + config.lockoutWindowMs;
        return {
            locked: true,
            reason: `Account locked due to ${record.consecutiveFailures} consecutive failed login attempts. Try again after ${new Date(unlocksAt).toISOString()}.`,
            unlocksAt,
        };
    }
    return { locked: false };
}
/**
 * Records a failed authentication attempt.
 * Returns the updated record.
 */
function recordFailedAttempt(existing, username, config, now = Date.now()) {
    if (!existing || now - existing.lastFailureAt > config.lockoutWindowMs) {
        // Start fresh — either no record or window expired
        return { username, consecutiveFailures: 1, lastFailureAt: now };
    }
    return {
        username,
        consecutiveFailures: existing.consecutiveFailures + 1,
        lastFailureAt: now,
    };
}
//# sourceMappingURL=lockoutTracking.js.map