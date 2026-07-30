/**
 * POST /claims/{id}/documents endpoint.
 *
 * Reuses the shared upload validator and the claim-ownership predicate;
 * returns an explicit success confirmation on completion.
 *
 * _Requirements: 10.2, 10.3, 10.4_
 */
import type { SystemConfig } from '@claims/shared';
import { validateUpload, type UploadFile, type UploadValidationResult } from '@claims/shared';
import { checkClaimOwnership, type OwnershipCheckResult } from './claimOwnership';

/** Result of a document upload attempt. */
export type DocumentUploadResult =
  | { success: true; documentRef: string; message: string }
  | { success: false; reason: 'unauthorized' | 'format' | 'size'; message: string };

/** Dependencies for the document upload handler. */
export interface DocumentUploadDeps {
  getPolicyholderIds: (claimId: string) => Promise<string[] | null>;
  storeDocument: (claimId: string, file: UploadFile) => Promise<string>;
}

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
export async function handleDocumentUpload(
  claimId: string,
  customerId: string,
  file: UploadFile,
  config: SystemConfig,
  deps: DocumentUploadDeps,
): Promise<DocumentUploadResult> {
  // Check ownership
  const policyholderIds = await deps.getPolicyholderIds(claimId);
  const ownership: OwnershipCheckResult = checkClaimOwnership(customerId, policyholderIds);
  if (!ownership.authorized) {
    return { success: false, reason: 'unauthorized', message: ownership.message };
  }

  // Validate format/size
  const validation: UploadValidationResult = validateUpload(file, {
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
