import { useState, type ChangeEvent } from 'react';

/** Supported document formats (mirrors backend config). */
const SUPPORTED_FORMATS = ['PDF', 'JPEG', 'PNG'];
/** Maximum file size in bytes (mirrors backend config). */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface DocumentUploadProps {
  claimId: string;
  onSessionTimeout: () => void;
}

/**
 * Document Upload component.
 *
 * Client-side format/size pre-validation mirroring the shared upload
 * validator, upload progress indication, and explicit success/failure
 * confirmation.
 *
 * _Requirements: 10.2, 10.3, 10.4_
 */
export function DocumentUpload({ claimId, onSessionTimeout }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const getFileFormat = (filename: string): string => {
    const ext = filename.split('.').pop()?.toUpperCase() ?? '';
    if (ext === 'JPG') return 'JPEG';
    return ext;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setValidationError(null);
    const selected = e.target.files?.[0] ?? null;

    if (selected) {
      // Client-side format validation
      const format = getFileFormat(selected.name);
      if (!SUPPORTED_FORMATS.includes(format)) {
        setValidationError(
          `Unsupported file format "${format}". Supported formats: ${SUPPORTED_FORMATS.join(', ')}.`,
        );
        setFile(null);
        return;
      }

      // Client-side size validation
      if (selected.size > MAX_FILE_SIZE_BYTES) {
        setValidationError(
          `File size ${selected.size} bytes exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes.`,
        );
        setFile(null);
        return;
      }
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch(`/api/claims/${claimId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.status === 401) {
        onSessionTimeout();
        return;
      }

      const data = await response.json();
      setResult({
        success: response.ok,
        message: data.message ?? (response.ok ? 'Document uploaded successfully.' : 'Upload failed.'),
      });
    } catch {
      setResult({ success: false, message: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="document-upload" aria-label="Document Upload">
      <h3>Upload Document</h3>
      <input
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.jpeg,.jpg,.png"
        aria-label="Select document"
      />
      {validationError && (
        <p className="validation-error" role="alert">
          {validationError}
        </p>
      )}
      {file && !validationError && (
        <button onClick={handleUpload} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      )}
      {result && (
        <p className={result.success ? 'upload-success' : 'upload-failure'} role="status">
          {result.message}
        </p>
      )}
    </div>
  );
}
