import fc from 'fast-check';
import { UploadRules, validateUpload } from './validator';

// A file format alphabet disjoint enough that "supported" vs "unsupported"
// formats can be reliably distinguished after case-normalization, while
// still exercising arbitrary casing/whitespace.
const formatToken = fc
  .constantFrom('JPEG', 'PNG', 'HEIC', 'GIF', 'BMP', 'TIFF', 'PDF', 'DOCX', 'WEBP', 'RAW')
  .chain((base) =>
    fc.tuple(fc.boolean(), fc.constantFrom(' ', '', '  ')).map(([lower, pad]) => {
      const cased = lower ? base.toLowerCase() : base;
      return `${pad}${cased}${pad}`;
    }),
  );

const rulesArb = fc
  .record({
    supportedFormats: fc.uniqueArray(fc.constantFrom('JPEG', 'PNG', 'HEIC', 'GIF', 'BMP', 'TIFF', 'PDF', 'DOCX', 'WEBP', 'RAW'), {
      minLength: 1,
      maxLength: 6,
    }),
    maxSizeBytes: fc.integer({ min: 1, max: 20 * 1024 * 1024 }),
  })
  .map(({ supportedFormats, maxSizeBytes }): UploadRules => ({ supportedFormats, maxSizeBytes }));

const fileArb = fc.record({
  format: formatToken,
  sizeBytes: fc.integer({ min: 0, max: 40 * 1024 * 1024 }),
});

describe('validateUpload property test', () => {
  // Feature: claims-management-fnol, Property 17: Upload validation rejects unsupported or oversized files
  it('rejects a file if and only if its format is unsupported or its size exceeds the maximum, identifying an actual violation', () => {
    fc.assert(
      fc.property(fileArb, rulesArb, (file, rules) => {
        const result = validateUpload(file, rules);

        const normalizedFormat = file.format.trim().toUpperCase();
        const supportedNormalized = rules.supportedFormats.map((f) => f.trim().toUpperCase());
        const formatSupported = supportedNormalized.includes(normalizedFormat);
        const sizeWithinLimit = file.sizeBytes <= rules.maxSizeBytes;
        const shouldBeValid = formatSupported && sizeWithinLimit;

        if (shouldBeValid) {
          expect(result.valid).toBe(true);
        } else {
          expect(result.valid).toBe(false);
          if (!result.valid) {
            // The reported violation must correspond to an actual violation
            // present in the input (format violation only reported when the
            // format truly is unsupported; size violation only reported when
            // the size truly exceeds the max).
            if (result.violation === 'format') {
              expect(formatSupported).toBe(false);
            } else {
              expect(result.violation).toBe('size');
              expect(sizeWithinLimit).toBe(false);
            }
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
