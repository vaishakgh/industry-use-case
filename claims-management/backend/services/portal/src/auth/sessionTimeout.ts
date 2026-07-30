/**
 * Session idle-timeout enforcement.
 *
 * Enforces a configurable timeout (default 15 minutes, range 5-30) that
 * terminates the session and requires re-authentication once idle duration
 * is reached.
 *
 * _Requirements: 9.6_
 */
import type { SystemConfig } from '@claims/shared';

/** Session metadata needed for timeout evaluation. */
export interface SessionActivity {
  /** Timestamp of last user activity (epoch ms). */
  lastActivityAt: number;
}

/** Result of checking session timeout. */
export type SessionTimeoutResult =
  | { expired: false }
  | { expired: true; idleMinutes: number; maxMinutes: number };

/**
 * Checks whether a session has exceeded its idle timeout.
 *
 * @param session The session's last activity timestamp
 * @param config System config providing sessionTimeoutMinutes
 * @param now Current time in epoch ms (default: Date.now())
 * @returns Whether the session has expired
 */
export function checkSessionTimeout(
  session: SessionActivity,
  config: SystemConfig,
  now: number = Date.now(),
): SessionTimeoutResult {
  const idleMs = now - session.lastActivityAt;
  const timeoutMs = config.sessionTimeoutMinutes * 60 * 1000;

  if (idleMs >= timeoutMs) {
    return {
      expired: true,
      idleMinutes: Math.floor(idleMs / 60000),
      maxMinutes: config.sessionTimeoutMinutes,
    };
  }

  return { expired: false };
}
