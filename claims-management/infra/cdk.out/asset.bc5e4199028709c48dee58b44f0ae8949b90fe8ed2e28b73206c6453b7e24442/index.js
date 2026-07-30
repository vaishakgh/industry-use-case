// Damage Assessment Lambda handler (dev stub)
// Returns a successful assessment result the state machine can consume
exports.handler = async (event) => {
  return {
    claimId: event.claimId || 'unknown',
    severityRating: 'Low',
    estimatedRepairCost: 500,
    confidenceScore: 0.85,
    status: 'success',
  };
};
