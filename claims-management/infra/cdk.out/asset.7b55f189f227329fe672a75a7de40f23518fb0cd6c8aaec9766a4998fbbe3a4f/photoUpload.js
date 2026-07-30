"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePhotoUpload = handlePhotoUpload;
const shared_1 = require("@claims/shared");
/**
 * Handles a photo upload attempt for a claim.
 *
 * Validation order:
 * 1. Check maxPhotosPerClaim limit (reject early without further processing)
 * 2. Validate format/size via shared validator
 * 3. Store the photo and return the ref
 *
 * _Requirements: 4.1, 4.4, 4.5_
 */
async function handlePhotoUpload(file, claimState, config) {
    // Check photo count limit first (Req 4.1)
    if (claimState.currentPhotoCount >= config.maxPhotosPerClaim) {
        return {
            accepted: false,
            reason: 'max_photos_reached',
            message: `Maximum of ${config.maxPhotosPerClaim} photos per claim has been reached. No additional photos can be uploaded.`,
        };
    }
    // Validate format/size (Req 4.4, 4.5)
    const validation = (0, shared_1.validateUpload)(file, {
        supportedFormats: config.supportedImageFormats,
        maxSizeBytes: config.maxPhotoFileSizeBytes,
    });
    if (!validation.valid) {
        return {
            accepted: false,
            reason: validation.violation,
            message: validation.message,
        };
    }
    // Store the photo
    const photoRef = await claimState.storePhoto(file);
    return { accepted: true, photoRef };
}
//# sourceMappingURL=photoUpload.js.map