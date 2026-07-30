// Fraud Detection Lambda handler (dev stub)
// Returns no fraud indicators (claim passes fraud check)
exports.handler = async (event) => {
  return {
    claimId: event.claimId || 'unknown',
    fraudFlagged: false,
    indicators: [],
  };
};
