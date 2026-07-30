/**
 * extractFields tool.
 *
 * Extracts the four required Structured_Claim_Fields (policy number,
 * incident date, incident location, damage description) from unstructured
 * customer input text, producing a Confidence_Score in [0, 1] for each
 * extracted value.
 *
 * In a production deployment, this would invoke Bedrock AgentCore or an LLM
 * with a structured-extraction prompt. Here the interface is defined so that
 * tests can inject a mock extractor while the calling code (clarification
 * engine, orchestrator) depends only on the typed contract.
 *
 * _Requirements: 2.1, 2.2_
 */
import type { ConfidenceScore, StructuredFieldName } from '@claims/shared';

/**
 * A single extracted field result: the extracted value (or null if the
 * field could not be identified in the input) together with its confidence
 * score.
 */
export interface ExtractedField {
  fieldName: StructuredFieldName;
  value: string | null;
  confidenceScore: ConfidenceScore | null;
}

/** The full extraction result for a single input text. */
export interface ExtractionResult {
  /** One entry per structured field, even if that field was not found. */
  fields: ExtractedField[];
}

/**
 * The extraction function contract. Implementations accept raw customer
 * text and return extraction results for all four fields.
 *
 * The function MUST always return exactly 4 entries (one per
 * StructuredFieldName), even if a field could not be extracted (in which
 * case `value` is null and `confidenceScore` is null).
 */
export type ExtractFieldsFn = (rawText: string) => Promise<ExtractionResult>;
