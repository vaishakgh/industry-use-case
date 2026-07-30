"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSessionTimeout = checkSessionTimeout;
/**
 * Checks whether a session has exceeded its idle timeout.
 *
 * @param session The session's last activity timestamp
 * @param config System config providing sessionTimeoutMinutes
 * @param now Current time in epoch ms (default: Date.now())
 * @returns Whether the session has expired
 */
function checkSessionTimeout(session, config, now = Date.now()) {
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
//# sourceMappingURL=sessionTimeout.js.map