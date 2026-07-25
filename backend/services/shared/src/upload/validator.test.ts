import { UploadRules, validateUpload } from './validator';

describe('validateUpload', () => {
  const photoRules: UploadRules = {
    supportedFormats: ['JPEG', 'PNG', 'HEIC'],
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  };

  const documentRules: UploadRules = {
    supportedFormats: ['PDF', 'JPEG', 'PNG'],
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  };

  it('accepts a file with a supported format and a size within the limit', () => {
    const result = validateUpload({ format: 'JPEG', sizeBytes: 1024 }, photoRules);
    expect(result).toEqual({ valid: true });
  });

  it('accepts a file with a size exactly at the configured maximum', () => {
    const result = validateUpload({ format: 'PNG', sizeBytes: photoRules.maxSizeBytes }, photoRules);
    expect(result).toEqual({ valid: true });
  });

  it('is case-insensitive when matching the file format against supported formats', () => {
    const result = validateUpload({ format: 'jpeg', sizeBytes: 1024 }, photoRules);
    expect(result).toEqual({ valid: true });
  });

  it('rejects an unsupported format without storing the file, identifying it as a format violation', () => {
    const result = validateUpload({ format: 'GIF', sizeBytes: 1024 }, photoRules);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violation).toBe('format');
      expect(result.message).toContain('JPEG');
      expect(result.message).toContain('PNG');
      expect(result.message).toContain('HEIC');
    }
  });

  it('rejects an oversized file, identifying it as a size violation', () => {
    const result = validateUpload({ format: 'JPEG', sizeBytes: photoRules.maxSizeBytes + 1 }, photoRules);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violation).toBe('size');
      expect(result.message).toContain(String(photoRules.maxSizeBytes));
    }
  });

  it('deterministically reports the format violation when a file is both unsupported format and oversized', () => {
    const result = validateUpload({ format: 'GIF', sizeBytes: photoRules.maxSizeBytes + 1 }, photoRules);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violation).toBe('format');
    }
  });

  it('applies the same validation logic to portal document uploads using document rules', () => {
    expect(validateUpload({ format: 'PDF', sizeBytes: 2048 }, documentRules)).toEqual({ valid: true });

    const unsupported = validateUpload({ format: 'EXE', sizeBytes: 2048 }, documentRules);
    expect(unsupported.valid).toBe(false);
    if (!unsupported.valid) {
      expect(unsupported.violation).toBe('format');
    }

    const oversized = validateUpload({ format: 'PDF', sizeBytes: documentRules.maxSizeBytes + 1 }, documentRules);
    expect(oversized.valid).toBe(false);
    if (!oversized.valid) {
      expect(oversized.violation).toBe('size');
    }
  });
});
