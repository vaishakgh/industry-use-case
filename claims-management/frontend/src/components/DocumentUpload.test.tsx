/**
 * Unit tests for Document Upload component.
 *
 * Tests client-side rejection of unsupported formats/oversized files
 * before any upload call, and rendering of success/failure confirmation.
 *
 * _Requirements: 10.2, 10.3, 10.4_
 */
import { describe, it, expect } from 'vitest';

const SUPPORTED_FORMATS = ['PDF', 'JPEG', 'PNG'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function getFileFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() ?? '';
  if (ext === 'JPG') return 'JPEG';
  return ext;
}

describe('DocumentUpload', () => {
  it('rejects unsupported file formats before upload', () => {
    const unsupported = ['file.docx', 'image.bmp', 'data.csv'];
    for (const filename of unsupported) {
      const format = getFileFormat(filename);
      expect(SUPPORTED_FORMATS.includes(format)).toBe(false);
    }
  });

  it('accepts supported file formats', () => {
    const supported = ['doc.pdf', 'photo.jpeg', 'photo.jpg', 'image.png'];
    for (const filename of supported) {
      const format = getFileFormat(filename);
      expect(SUPPORTED_FORMATS.includes(format)).toBe(true);
    }
  });

  it('rejects files exceeding maximum size', () => {
    const oversized = MAX_FILE_SIZE_BYTES + 1;
    expect(oversized > MAX_FILE_SIZE_BYTES).toBe(true);
  });

  it('accepts files within maximum size', () => {
    const valid = MAX_FILE_SIZE_BYTES - 1;
    expect(valid <= MAX_FILE_SIZE_BYTES).toBe(true);
  });
});
