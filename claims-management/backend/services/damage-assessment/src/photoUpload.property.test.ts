/**
 * Property-based test for photo upload count maximum.
 *
 * Property 15: Photo upload count respects the configured maximum
 * For any claim that already has `maxPhotosPerClaim` photos associated,
 * any subsequent upload attempt SHALL be rejected without storing the file.
 *
 * _Requirements: 4.1_
 */
import fc from 'fast-check';
import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from '@claims/shared';
import { handlePhotoUpload, type ClaimPhotoState } from './photoUpload';
import type { UploadFile } from '@claims/shared';

describe('handlePhotoUpload property tests', () => {
  // Feature: claims-management-fnol, Property 15: Photo upload count respects the configured maximum
  it('rejects any upload when currentPhotoCount >= maxPhotosPerClaim, without calling storePhoto', async () => {
    await fc.assert(
      fc.asyncProperty(
        // maxPhotosPerClaim between 1 and 20
        fc.integer({ min: 1, max: 20 }),
        // currentPhotoCount at or above the max
        fc.integer({ min: 0, max: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        async (maxPhotos, overflowOffset, filename, sizeBytes) => {
          const currentPhotoCount = maxPhotos + overflowOffset; // always >= max

          const config: SystemConfig = {
            ...DEFAULT_SYSTEM_CONFIG,
            maxPhotosPerClaim: maxPhotos,
          };

          const file: UploadFile = { format: 'JPEG', sizeBytes };
          let storePhotoCalled = false;
          const claimState: ClaimPhotoState = {
            currentPhotoCount,
            storePhoto: async () => {
              storePhotoCalled = true;
              return 's3://photo-ref';
            },
          };

          const result = await handlePhotoUpload(file, claimState, config);

          expect(result.accepted).toBe(false);
          if (!result.accepted) {
            expect(result.reason).toBe('max_photos_reached');
          }
          expect(storePhotoCalled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('accepts a valid upload when currentPhotoCount < maxPhotosPerClaim', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 19 }),
        async (maxPhotos, countBelow) => {
          const currentPhotoCount = Math.min(countBelow, maxPhotos - 1);

          const config: SystemConfig = {
            ...DEFAULT_SYSTEM_CONFIG,
            maxPhotosPerClaim: maxPhotos,
          };

          const file: UploadFile = { format: 'JPEG', sizeBytes: 1024 };
          const claimState: ClaimPhotoState = {
            currentPhotoCount,
            storePhoto: async () => `s3://photos/${currentPhotoCount}`,
          };

          const result = await handlePhotoUpload(file, claimState, config);

          expect(result.accepted).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
