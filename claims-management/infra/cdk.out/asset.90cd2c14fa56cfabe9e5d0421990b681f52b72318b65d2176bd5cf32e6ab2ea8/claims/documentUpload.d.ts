/**
 * POST /claims/{id}/documents endpoint.
 *
 * Reuses the shared upload validator and the claim-ownership predicate;
 * returns an explicit success confirmation on completion.
 *
 * _Requirements: 10.2, 10.3, 10.4_
 */
import type { SystemConfig } from '@claims/shared';
import { type UploadFile } from '@claims/shared';
/** Result of a document upload attempt. */
export type DocumentUploadResult = {
    success: true;
    documentRef: string;
    message: string;
} | {
    success: false;
    reason: 'unauthorized' | 'format' | 'size';
    message: string;
};
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
export declare function handleDocumentUpload(claimId: string, customerId: string, file: UploadFile, config: SystemConfig, deps: DocumentUploadDeps): Promise<DocumentUploadResult>;
//# sourceMappingURL=documentUpload.d.ts.map