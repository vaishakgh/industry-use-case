/**
 * Lambda handler entry point for the Damage Assessment Service.
 *
 * Invoked by Step Functions during the Assessment stage. Analyzes
 * photos associated with the claim and returns severity/cost/confidence.
 */
import { handlePhotoUpload } from './photoUpload';
import { aggregatePhotoAnalysis, type RekognitionAnalysisClient, type SinglePhotoAnalysis } from './analysisAggregation';
import { evaluateResubmissionLifecycle } from './resubmissionLifecycle';
import { DEFAULT_SYSTEM_CONFIG } from '@claims/shared';

/**
 * Mock Rekognition client for dev — produces deterministic results.
 * In production, replace with real Rekognition API calls.
 */
const mockRekognitionClient: RekognitionAnalysisClient = {
  analyzePhoto: async (photoRef: string): Promise<SinglePhotoAnalysis> => ({
    severityRating: 'Low',
    estimatedRepairCost: 500,
    confidenceScore: 0.85,
    qualitySufficient: true,
  }),
};

export async function handler(event: any): Promise<any> {
  const claimId = event.claimId || 'unknown';
  const config = DEFAULT_SYSTEM_CONFIG;

  try {
    // If photos are provided, run analysis
    const photoRefs = event.photoRefs || [`s3://claims-damage-photos-dev/${claimId}/photo-1.jpg`];

    const outcome = await aggregatePhotoAnalysis(photoRefs, mockRekognitionClient);
    const action = evaluateResubmissionLifecycle(outcome, event.photoResubmissionCount || 0, config);

    if (action.type === 'apply_assessment') {
      return {
        claimId,
        severityRating: action.assessment.severityRating,
        estimatedRepairCost: action.assessment.estimatedRepairCost,
        confidenceScore: action.assessment.confidenceScore,
        status: 'success',
      };
    }

    if (action.type === 'request_resubmission') {
      return {
        claimId,
        status: 'resubmission_requested',
        resubmissionCount: action.resubmissionCount,
        message: action.message,
      };
    }

    // Escalation
    return {
      claimId,
      status: 'escalated',
      reason: action.reason,
      decision: 'pending_adjuster',
    };
  } catch (error: any) {
    return {
      claimId,
      status: 'error',
      error: error.message,
    };
  }
}
