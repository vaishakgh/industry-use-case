/**
 * Shared upload validator, used by both damage-photo uploads
 * (services/damage-assessment) and portal-document uploads
 * (services/portal).
 *
 * Requirements 4.4/4.5 (damage photos) and 10.2/10.3 (portal documents)
 * describe the same format/size validation predicate applied to two
 * different upload endpoints -- consolidated in the design as
 * Property 17. This module implements that predicate once, so both
 * callers reject an invalid file *before any S3 write* and can surface
 * the caller's specific, requirement-mandated error message (the
 * supported formats, or the maximum file size).
 */

/** The minimal shape of an uploaded file needed to validate it. */
export interface UploadFile {
  /**
   * The file's format, e.g. `'JPEG'`, `'PNG'`, `'PDF'`. Compared against
   * `UploadRules.supportedFormats` case-insensitively, since callers may
   * derive this from a file extension or a `Content-Type` subtype whose
   * casing is not guaranteed.
   */
  format: string;
  /** The file's size in bytes. */
  sizeBytes: number;
}

/** The configured limits a given upload must satisfy. */
export interface UploadRules {
  /** The configured set of supported formats (e.g. `supportedImageFormats`). */
  supportedFormats: string[];
  /** The configured maximum file size in bytes (e.g. `maxPhotoFileSizeBytes`). */
  maxSizeBytes: number;
}

/** Which specific limit was violated by a rejected upload. */
export type UploadViolationKind = 'format' | 'size';

export interface UploadValidationSuccess {
  valid: true;
}

export interface UploadValidationFailure {
  valid: false;
  /** Identifies the specific violated constraint, not a generic error. */
  violation: UploadViolationKind;
  /**
   * A human-readable message describing the violated limit, suitable for
   * surfacing to the customer (Req 4.4/4.5: supported formats or max file
   * size; Req 10.3: same, for document uploads).
   */
  message: string;
}

export type UploadValidationResult = UploadValidationSuccess | UploadValidationFailure;

/**
 * Validates an uploaded file's format and size against the configured
 * rules, before any S3 write.
 *
 * Precedence: when a file violates *both* the format and size
 * constraints, this function deterministically reports the **format**
 * violation. Format is checked first because an unsupported format is
 * rejected outright regardless of size (the file could not be processed
 * even if it were small enough), so it is the more fundamental defect.
 * Callers that need to know about every violated constraint should not
 * assume this result is exhaustive -- it always reports exactly one
 * violation, the first one found.
 */
export function validateUpload(file: UploadFile, rules: UploadRules): UploadValidationResult {
  const normalizedFormat = file.format.trim().toUpperCase();
  const supportedFormatsNormalized = rules.supportedFormats.map((format) => format.trim().toUpperCase());

  if (!supportedFormatsNormalized.includes(normalizedFormat)) {
    return {
      valid: false,
      violation: 'format',
      message: `Unsupported file format "${file.format}". Supported formats: ${rules.supportedFormats.join(', ')}.`,
    };
  }

  if (file.sizeBytes > rules.maxSizeBytes) {
    return {
      valid: false,
      violation: 'size',
      message: `File size ${file.sizeBytes} bytes exceeds the maximum allowed size of ${rules.maxSizeBytes} bytes.`,
    };
  }

  return { valid: true };
}
