"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDamageAssessmentDecision = exports.evaluateResubmissionLifecycle = exports.aggregatePhotoAnalysis = exports.handlePhotoUpload = exports.DAMAGE_ASSESSMENT_PACKAGE_NAME = void 0;
/**
 * @claims/damage-assessment
 *
 * Damage Assessment Service: validates and stores uploaded damage photos,
 * invokes Amazon Rekognition to aggregate per-photo results into a single
 * Severity_Rating, estimated repair cost, and Confidence_Score for a Claim.
 */
exports.DAMAGE_ASSESSMENT_PACKAGE_NAME = '@claims/damage-assessment';
var photoUpload_1 = require("./photoUpload");
Object.defineProperty(exports, "handlePhotoUpload", { enumerable: true, get: function () { return photoUpload_1.handlePhotoUpload; } });
var analysisAggregation_1 = require("./analysisAggregation");
Object.defineProperty(exports, "aggregatePhotoAnalysis", { enumerable: true, get: function () { return analysisAggregation_1.aggregatePhotoAnalysis; } });
var resubmissionLifecycle_1 = require("./resubmissionLifecycle");
Object.defineProperty(exports, "evaluateResubmissionLifecycle", { enumerable: true, get: function () { return resubmissionLifecycle_1.evaluateResubmissionLifecycle; } });
var auditIntegration_1 = require("./auditIntegration");
Object.defineProperty(exports, "recordDamageAssessmentDecision", { enumerable: true, get: function () { return auditIntegration_1.recordDamageAssessmentDecision; } });
//# sourceMappingURL=index.js.map