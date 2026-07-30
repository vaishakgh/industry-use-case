// Fraud Detection Lambda handler (standalone, no workspace imports)
exports.handler = async (event) => {
  const claimId = event.claimId || 'unknown';
  const indicators = [];

  // 1. Claim frequency check
  const priorClaimCount = event.priorClaimCount || 1;
  const frequencyThreshold = 3;
  if (priorClaimCount > frequencyThreshold) {
    indicators.push({
      type: 'ClaimFrequency',
      confidenceScore: Math.min(1, (priorClaimCount - frequencyThreshold) / frequencyThreshold),
      detectedAt: new Date().toISOString(),
    });
  }

  // 2. Timeline discrepancy check
  if (event.incidentDate && event.claimCreatedDate) {
    const incidentTime = new Date(event.incidentDate).getTime();
    const claimCreatedTime = new Date(event.claimCreatedDate).getTime();
    if (incidentTime > claimCreatedTime) {
      indicators.push({
        type: 'TimelineDiscrepancy',
        confidenceScore: 0.9,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return {
    claimId,
    fraudFlagged: indicators.length > 0,
    indicators,
  };
};
