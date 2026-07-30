// Orchestrator Lambda handler (dev stub)
// Handles EvaluateApproval, RunPayout, and NotifyCustomer
exports.handler = async (event) => {
  // Determine which function this is based on context
  // EvaluateApproval: returns decision
  if (!event.decision && !event.paymentInitiated) {
    return {
      claimId: event.claimId || 'unknown',
      decision: 'approved',
      reason: 'Auto-approved: low severity, within cost threshold, no fraud flag',
    };
  }

  // RunPayout: returns payment result
  if (event.decision === 'approved') {
    return {
      claimId: event.claimId || 'unknown',
      paymentInitiated: true,
      newClaimStatus: 'Paid',
    };
  }

  // NotifyCustomer: returns notification result
  return {
    claimId: event.claimId || 'unknown',
    notified: true,
    channel: 'Email',
    status: event.newClaimStatus || 'Approved',
  };
};
