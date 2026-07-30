/**
 * Rekognition analysis aggregation.
 *
 * Aggregates per-photo Rekognition analysis results into a single
 * Severity_Rating, estimated repair cost, and Confidence_Score for a Claim.
 *
 * The actual Amazon Rekognition API is abstracted behind the
 * `RekognitionAnalysisClient` interface so tests never call a real AWS
 * service (per the design's mocking-boundary guidance).
 *
 * _Requirements: 4.2, 4.3_
 */
import type { ConfidenceScore, SeverityRating } from '@claims/shared';

/** The result of analyzing a single photo via Rekognition. */
export interface SinglePhotoAnalysis {
  /** Detected severity for this photo. */
  severityRating: SeverityRating;
  /** Estimated repair cost for damage visible in this photo (in whole currency units). */
  estimatedRepairCost: number;
  /** Analysis confidence in [0, 1]. */
  confidenceScore: ConfidenceScore;
  /** Whether the photo quality was sufficient for reliable analysis. */
  qualitySufficient: boolean;
}

/**
 * Mockable boundary abstracting Amazon Rekognition. A real implementation
 * calls the Rekognition DetectLabels/Custom Labels API; tests supply a
 * deterministic mock.
 */
export interface RekognitionAnalysisClient {
  analyzePhoto(photoRef: string): Promise<SinglePhotoAnalysis>;
}

/** The aggregated assessment result for all photos on a claim. */
export interface AggregatedAssessment {
  severityRating: SeverityRating;
  estimatedRepairCost: number;
  confidenceScore: ConfidenceScore;
}

/** Possible outcomes of running the damage assessment. */
export type AssessmentOutcome =
  | { status: 'success'; assessment: AggregatedAssessment }
  | { status: 'quality_issue'; insufficientPhotoRefs: string[] }
  | { status: 'analysis_failure'; error: string };

/** Severity ordering for aggregation: take the highest severity across photos. */
const SEVERITY_ORDER: Record<SeverityRating, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
};

function maxSeverity(a: SeverityRating, b: SeverityRating): SeverityRating {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

/**
 * Analyzes all photos associated with a claim and aggregates the results
 * into a single assessment.
 *
 * Aggregation rules:
 * - Severity: highest severity across all photos (worst-case)
 * - Estimated repair cost: sum of per-photo costs (total damage)
 * - Confidence: minimum confidence across all photos (weakest link)
 *
 * If any photo has insufficient quality, returns a `quality_issue` outcome
 * so the caller can request resubmission.
 *
 * _Requirements: 4.2, 4.3_
 */
export async function aggregatePhotoAnalysis(
  photoRefs: string[],
  client: RekognitionAnalysisClient,
): Promise<AssessmentOutcome> {
  if (photoRefs.length === 0) {
    return { status: 'analysis_failure', error: 'No photos to analyze' };
  }

  const results: SinglePhotoAnalysis[] = [];
  const insufficientPhotoRefs: string[] = [];

  for (const ref of photoRefs) {
    try {
      const analysis = await client.analyzePhoto(ref);
      if (!analysis.qualitySufficient) {
        insufficientPhotoRefs.push(ref);
      }
      results.push(analysis);
    } catch (error) {
      return {
        status: 'analysis_failure',
        error: error instanceof Error ? error.message : 'Unknown analysis error',
      };
    }
  }

  // If any photos had quality issues, report for resubmission
  if (insufficientPhotoRefs.length > 0) {
    return { status: 'quality_issue', insufficientPhotoRefs };
  }

  // Aggregate: highest severity, sum of costs, min confidence
  let aggregatedSeverity: SeverityRating = results[0]!.severityRating;
  let totalCost = 0;
  let minConfidence: ConfidenceScore = 1;

  for (const result of results) {
    aggregatedSeverity = maxSeverity(aggregatedSeverity, result.severityRating);
    totalCost += result.estimatedRepairCost;
    minConfidence = Math.min(minConfidence, result.confidenceScore);
  }

  return {
    status: 'success',
    assessment: {
      severityRating: aggregatedSeverity,
      estimatedRepairCost: totalCost,
      confidenceScore: minConfidence,
    },
  };
}
