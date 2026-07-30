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
export declare const DEFAULT_LOCKOUT_CONFIG: LockoutConfig;
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
export type LockoutCheckResult = {
    locked: false;
} | {
    locked: true;
    reason: string;
    unlocksAt: number;
};
/**
 * Checks if an account is locked out.
 */
export declare function checkLockout(record: FailedAttemptRecord | null, config: LockoutConfig, now?: number): LockoutCheckResult;
/**
 * Records a failed authentication attempt.
 * Returns the updated record.
 */
export declare function recordFailedAttempt(existing: FailedAttemptRecord | null, username: string, config: LockoutConfig, now?: number): FailedAttemptRecord;
//# sourceMappingURL=lockoutTracking.d.ts.map