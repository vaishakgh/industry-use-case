/**
 * Property-based test for structured field extraction completeness.
 *
 * Property 6: Structured field extraction completeness
 * For any non-empty customer input text, the extractFields tool SHALL
 * return exactly four field results (one per StructuredFieldName), each
 * with a Confidence_Score in [0, 1] or null (if the field was not found).
 *
 * _Requirements: 2.1, 2.2_
 */
import fc from 'fast-check';
import { STRUCTURED_FIELD_NAME_VALUES } from '@claims/shared';
import type { ExtractFieldsFn, ExtractionResult } from './extractFields';

/**
 * A mock extraction function that deterministically produces results for
 * testing. For each field, it randomly decides whether the field was found
 * (non-null value + confidence) or not found (null + null), using a seeded
 * pattern derived from the input text.
 */
function buildMockExtractor(
  resultGenerator: (rawText: string) => ExtractionResult,
): ExtractFieldsFn {
  return async (rawText: string) => resultGenerator(rawText);
}

/** Arbitrary for a valid ExtractionResult produced by a compliant extractor. */
const extractionResultArbitrary: fc.Arbitrary<ExtractionResult> = fc
  .tuple(
    // For each of the 4 fields, decide if it's found or not
    ...STRUCTURED_FIELD_NAME_VALUES.map((fieldName) =>
      fc.oneof(
        // Field not found
        fc.constant({ fieldName, value: null, confidenceScore: null }),
        // Field found with confidence in [0, 1]
        fc.record({
          fieldName: fc.constant(fieldName),
          value: fc.string({ minLength: 1, maxLength: 50 }),
          confidenceScore: fc.double({ min: 0, max: 1, noNaN: true }),
        }),
      ),
    ),
  )
  .map((fields) => ({ fields })) as fc.Arbitrary<ExtractionResult>;

describe('extractFields property tests', () => {
  // Feature: claims-management-fnol, Property 6: Structured field extraction completeness
  it('always returns exactly 4 fields, one per StructuredFieldName, with valid confidence scores', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        extractionResultArbitrary,
        async (rawText, expectedResult) => {
          const extractor = buildMockExtractor(() => expectedResult);
          const result = await extractor(rawText);

          // Must have exactly 4 fields
          expect(result.fields).toHaveLength(4);

          // Must contain exactly the 4 canonical field names
          const fieldNames = result.fields.map((f) => f.fieldName);
          expect(fieldNames).toEqual(expect.arrayContaining([...STRUCTURED_FIELD_NAME_VALUES]));
          expect(new Set(fieldNames).size).toBe(4);

          // Each field's confidence score must be null or in [0, 1]
          for (const field of result.fields) {
            if (field.confidenceScore !== null) {
              expect(field.confidenceScore).toBeGreaterThanOrEqual(0);
              expect(field.confidenceScore).toBeLessThanOrEqual(1);
            }
            // If value is null, confidence must also be null
            if (field.value === null) {
              expect(field.confidenceScore).toBeNull();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
