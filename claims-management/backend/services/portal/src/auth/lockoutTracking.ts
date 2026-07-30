/**
 * PreAuthentication Lambda trigger for lockout tracking.
 *
 * Tracks consecutive failed attempts per account and denies attempts
 * once 5 consecutive failures occur within 15 minutes, until lockout expires.
 *
 * _Requirements: 9.3_
 */

/** Lockout configuration. */
export interface LockoutConfig {
  maxConsecutiveFailures: number;
  lockoutWindowMs: number;
}

export const DEFAULT_LOCKOUT_CONFIG: LockoutConfig = {
  maxConsecutiveFailures: 5,
  lockoutWindowMs: 15 * 60 * 1000, // 15 minutes
};

/** Record of failed attempts for a user. */
export interface FailedAttemptRecord {
  username: string;
  consecutiveFailures: number;
  lastFailureAt: number;
}

/** The lockout store interface. */
export interface LockoutStore {
  getRecord(username: string): Promise<FailedAttemptRecord | null>;
  putRecord(record: FailedAttemptRecord): Promise<void>;
  deleteRecord(username: string): Promise<void>;
}

/** Result of evaluating lockout status. */
export type LockoutCheckResult =
  | { locked: false }
  | { locked: true; reason: string; unlocksAt: number };

/**
 * Checks if an account is locked out.
 */
export function checkLockout(
  record: FailedAttemptRecord | null,
  config: LockoutConfig,
  now: number = Date.now(),
): LockoutCheckResult {
  if (!record) return { locked: false };

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
export function recordFailedAttempt(
  existing: FailedAttemptRecord | null,
  username: string,
  config: LockoutConfig,
  now: number = Date.now(),
): FailedAttemptRecord {
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
