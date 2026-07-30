/**
 * Photo upload handler.
 *
 * Validates an uploaded damage photo (format/size via the shared upload
 * validator) and enforces the `maxPhotosPerClaim` limit, rejecting uploads
 * once the maximum is reached.
 *
 * _Requirements: 4.1, 4.4, 4.5_
 */
import type { SystemConfig } from '@claims/shared';
import { validateUpload, type UploadFile, type UploadValidationResult } from '@claims/shared';

/** Result of attempting to upload a photo. */
export type PhotoUploadResult =
  | { accepted: true; photoRef: string }
  | { accepted: false; reason: 'format' | 'size' | 'max_photos_reached'; message: string };

/** Minimal claim photo state needed by the upload handler. */
export interface ClaimPhotoState {
  /** Current number of photos already associated with the claim. */
  currentPhotoCount: number;
  /** Function to persist the photo and return its S3 ref. */
  storePhoto: (file: UploadFile) => Promise<string>;
}

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
export async function handlePhotoUpload(
  file: UploadFile,
  claimState: ClaimPhotoState,
  config: SystemConfig,
): Promise<PhotoUploadResult> {
  // Check photo count limit first (Req 4.1)
  if (claimState.currentPhotoCount >= config.maxPhotosPerClaim) {
    return {
      accepted: false,
      reason: 'max_photos_reached',
      message: `Maximum of ${config.maxPhotosPerClaim} photos per claim has been reached. No additional photos can be uploaded.`,
    };
  }

  // Validate format/size (Req 4.4, 4.5)
  const validation: UploadValidationResult = validateUpload(file, {
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
