"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateFraudIndicators = exports.checkTimelineDiscrepancy = exports.TIMELINE_DISCREPANCY_INDICATOR_TYPE = exports.checkClaimFrequency = exports.CLAIM_FREQUENCY_INDICATOR_TYPE = void 0;
var claimFrequency_1 = require("./claimFrequency");
Object.defineProperty(exports, "CLAIM_FREQUENCY_INDICATOR_TYPE", { enumerable: true, get: function () { return claimFrequency_1.CLAIM_FREQUENCY_INDICATOR_TYPE; } });
Object.defineProperty(exports, "checkClaimFrequency", { enumerable: true, get: function () { return claimFrequency_1.checkClaimFrequency; } });
var timelineDiscrepancy_1 = require("./timelineDiscrepancy");
Object.defineProperty(exports, "TIMELINE_DISCREPANCY_INDICATOR_TYPE", { enumerable: true, get: function () { return timelineDiscrepancy_1.TIMELINE_DISCREPANCY_INDICATOR_TYPE; } });
Object.defineProperty(exports, "checkTimelineDiscrepancy", { enumerable: true, get: function () { return timelineDiscrepancy_1.checkTimelineDiscrepancy; } });
var fraudFlagAggregation_1 = require("./fraudFlagAggregation");
Object.defineProperty(exports, "aggregateFraudIndicators", { enumerable: true, get: function () { return fraudFlagAggregation_1.aggregateFraudIndicators; } });
//# sourceMappingURL=index.js.map