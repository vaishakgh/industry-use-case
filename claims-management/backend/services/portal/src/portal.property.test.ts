/**
 * Property-based tests for Customer Portal backend (Sections 15-16).
 *
 * Property 34: Authentication failure message uniformity
 * Property 35: Consecutive-failure account lockout
 * Property 36: Claim access authorization
 * Property 37: Session idle timeout enforcement
 * Property 38: Claim status view data pass-through
 * Property 43: PII access authorization and denial audit
 *
 * _Requirements: 9.2-9.6, 10.1, 10.5, 10.6, 12.3, 12.4_
 */
import fc from 'fast-check';
import {
  DEFAULT_SYSTEM_CONFIG,
  ROLE_VALUES,
  CLAIM_STATUS_VALUES,
  type Role,
  type SystemConfig,
  type StatusHistoryEntry,
  type AuditLogRecord,
} from '@claims/shared';
import { INVALID_CREDENTIALS_MESSAGE } from './auth/authClient';
import { checkLockout, recordFailedAttempt, DEFAULT_LOCKOUT_CONFIG, type FailedAttemptRecord, type LockoutConfig } from './auth/lockoutTracking';
import { checkSessionTimeout, type SessionActivity } from './auth/sessionTimeout';
import { checkClaimOwnership, CLAIM_NOT_ACCESSIBLE_MESSAGE } from './claims/claimOwnership';
import { buildClaimStatusResponse } from './claims/claimStatusEndpoint';
import { checkPiiAccess, PII_AUTHORIZED_ROLES } from './claims/piiAuthorization';

// ─── Property 34: Authentication failure message uniformity ──────────────────

describe('Property 34: Authentication failure message uniformity', () => {
  it('the INVALID_CREDENTIALS_MESSAGE is a single, constant, non-leaking string', () => {
    // This property verifies the constant exists and is always the same
    expect(INVALID_CREDENTIALS_MESSAGE).toBe('Invalid username or password.');
    expect(typeof INVALID_CREDENTIALS_MESSAGE).toBe('string');
    expect(INVALID_CREDENTIALS_MESSAGE.length).toBeGreaterThan(0);
  });
});

// ─── Property 35: Consecutive-failure account lockout ────────────────────────

describe('Property 35: Consecutive-failure account lockout', () => {
  it('locks out iff consecutive failures >= max within the window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // maxFailures
        fc.integer({ min: 0, max: 15 }), // consecutiveFailures
        fc.integer({ min: 0, max: 20 * 60 * 1000 }), // elapsed since last failure
        (maxFailures, consecutiveFailures, elapsedMs) => {
          const config: LockoutConfig = {
            maxConsecutiveFailures: maxFailures,
            lockoutWindowMs: 15 * 60 * 1000,
          };
          const now = 1000000;
          const lastFailureAt = now - elapsedMs;

          const record: FailedAttemptRecord | null = consecutiveFailures > 0
            ? { username: 'testuser', consecutiveFailures, lastFailureAt }
            : null;

          const result = checkLockout(record, config, now);

          const withinWindow = elapsedMs <= config.lockoutWindowMs;
          const shouldBeLocked = record !== null && withinWindow && consecutiveFailures >= maxFailures;

          expect(result.locked).toBe(shouldBeLocked);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('recordFailedAttempt increments the counter within the window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (currentFailures) => {
          const config = DEFAULT_LOCKOUT_CONFIG;
          const now = 1000000;
          const existing: FailedAttemptRecord = {
            username: 'testuser',
            consecutiveFailures: currentFailures,
            lastFailureAt: now - 1000, // 1 second ago (within window)
          };

          const updated = recordFailedAttempt(existing, 'testuser', config, now);

          expect(updated.consecutiveFailures).toBe(currentFailures + 1);
          expect(updated.lastFailureAt).toBe(now);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 36: Claim access authorization ─────────────────────────────────

describe('Property 36: Claim access authorization', () => {
  it('authorizes iff customerId is in policyholderIds, denies with generic message otherwise', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
        fc.boolean(), // whether to include the customerId in the list
        (customerId, otherIds, includeCustomer) => {
          const policyholderIds = includeCustomer
            ? [...otherIds, customerId]
            : otherIds.filter((id) => id !== customerId);

          const result = checkClaimOwnership(customerId, policyholderIds);

          if (policyholderIds.includes(customerId)) {
            expect(result.authorized).toBe(true);
          } else {
            expect(result.authorized).toBe(false);
            if (!result.authorized) {
              expect(result.message).toBe(CLAIM_NOT_ACCESSIBLE_MESSAGE);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns generic denial when claim does not exist (policyholderIds is null)', () => {
    const result = checkClaimOwnership('any-customer', null);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.message).toBe(CLAIM_NOT_ACCESSIBLE_MESSAGE);
    }
  });
});

// ─── Property 37: Session idle timeout enforcement ───────────────────────────

describe('Property 37: Session idle timeout enforcement', () => {
  it('expires iff idle time >= configured timeout', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 30 }), // timeoutMinutes
        fc.integer({ min: 0, max: 60 }), // idleMinutes
        (timeoutMinutes, idleMinutes) => {
          const config: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG, sessionTimeoutMinutes: timeoutMinutes };
          const now = 10000000;
          const session: SessionActivity = {
            lastActivityAt: now - idleMinutes * 60 * 1000,
          };

          const result = checkSessionTimeout(session, config, now);

          if (idleMinutes >= timeoutMinutes) {
            expect(result.expired).toBe(true);
          } else {
            expect(result.expired).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 38: Claim status view data pass-through ────────────────────────

describe('Property 38: Claim status view data pass-through', () => {
  it('passes through status and history without mutation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 26 }),
        fc.constantFrom(...CLAIM_STATUS_VALUES),
        fc.array(
          fc.record({
            status: fc.constantFrom(...CLAIM_STATUS_VALUES),
            timestamp: fc.constant('2024-06-01T00:00:00.000Z'),
          }),
          { minLength: 0, maxLength: 10 },
        ),
        (claimId, currentStatus, statusHistory) => {
          const response = buildClaimStatusResponse(claimId, currentStatus, statusHistory);

          expect(response.claimId).toBe(claimId);
          expect(response.currentStatus).toBe(currentStatus);
          expect(response.statusHistory).toEqual(statusHistory);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 43: PII access authorization and denial audit ──────────────────

describe('Property 43: PII access authorization and denial audit', () => {
  it('grants access to PII_AUTHORIZED_ROLES and system components, denies all others', () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom(...ROLE_VALUES), { nil: null }),
        fc.boolean(),
        (role, isSystem) => {
          const result = checkPiiAccess(role, isSystem);

          const shouldGrant = isSystem || (role !== null && PII_AUTHORIZED_ROLES.includes(role));

          expect(result.granted).toBe(shouldGrant);
        },
      ),
      { numRuns: 100 },
    );
  });
});
