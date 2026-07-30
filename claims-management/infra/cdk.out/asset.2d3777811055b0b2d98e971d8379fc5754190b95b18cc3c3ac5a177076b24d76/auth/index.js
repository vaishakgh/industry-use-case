"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSessionTimeout = exports.DEFAULT_LOCKOUT_CONFIG = exports.recordFailedAttempt = exports.checkLockout = exports.createAuthClient = exports.INVALID_CREDENTIALS_MESSAGE = exports.COGNITO_APP_CLIENT_ID = exports.CognitoAuthClient = void 0;
var authClient_1 = require("./authClient");
Object.defineProperty(exports, "CognitoAuthClient", { enumerable: true, get: function () { return authClient_1.CognitoAuthClient; } });
Object.defineProperty(exports, "COGNITO_APP_CLIENT_ID", { enumerable: true, get: function () { return authClient_1.COGNITO_APP_CLIENT_ID; } });
Object.defineProperty(exports, "INVALID_CREDENTIALS_MESSAGE", { enumerable: true, get: function () { return authClient_1.INVALID_CREDENTIALS_MESSAGE; } });
Object.defineProperty(exports, "createAuthClient", { enumerable: true, get: function () { return authClient_1.createAuthClient; } });
var lockoutTracking_1 = require("./lockoutTracking");
Object.defineProperty(exports, "checkLockout", { enumerable: true, get: function () { return lockoutTracking_1.checkLockout; } });
Object.defineProperty(exports, "recordFailedAttempt", { enumerable: true, get: function () { return lockoutTracking_1.recordFailedAttempt; } });
Object.defineProperty(exports, "DEFAULT_LOCKOUT_CONFIG", { enumerable: true, get: function () { return lockoutTracking_1.DEFAULT_LOCKOUT_CONFIG; } });
var sessionTimeout_1 = require("./sessionTimeout");
Object.defineProperty(exports, "checkSessionTimeout", { enumerable: true, get: function () { return sessionTimeout_1.checkSessionTimeout; } });
//# sourceMappingURL=index.js.map