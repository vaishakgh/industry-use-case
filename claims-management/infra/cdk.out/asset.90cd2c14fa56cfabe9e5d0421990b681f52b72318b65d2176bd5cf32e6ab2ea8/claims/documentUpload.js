"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDocumentUpload = handleDocumentUpload;
const shared_1 = require("@claims/shared");
const claimOwnership_1 = require("./claimOwnership");
/**
 * Handles a document upload for a claim.
 *
 * Steps:
 * 1. Check claim ownership
 * 2. Validate format/size
 * 3. Store document and return ref with success confirmation
 *
 * _Requirements: 10.2, 10.3, 10.4_
 */
async function handleDocumentUpload(claimId, customerId, file, config, deps) {
    // Check ownership
    const policyholderIds = await deps.getPolicyholderIds(claimId);
    const ownership = (0, claimOwnership_1.checkClaimOwnership)(customerId, policyholderIds);
    if (!ownership.authorized) {
        return { success: false, reason: 'unauthorized', message: ownership.message };
    }
    // Validate format/size
    const validation = (0, shared_1.validateUpload)(file, {
        supportedFormats: config.supportedDocumentFormats,
        maxSizeBytes: config.maxDocumentFileSizeBytes,
    });
    if (!validation.valid) {
        return { success: false, reason: validation.violation, message: validation.message };
    }
    // Store
    const documentRef = await deps.storeDocument(claimId, file);
    return {
        success: true,
        documentRef,
        message: 'Document uploaded successfully.',
    };
}
//# sourceMappingURL=documentUpload.js.map