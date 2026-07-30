// Orchestrator Lambda handler (standalone, no workspace imports)
// Handles EvaluateApproval, RunPayout, and NotifyCustomer

const SEVERITY_ORDER = { Low: 0, Medium: 1, High: 2 };

exports.handler = async (event) => {
  const claimId = event.claimId || 'unknown';

  // Detect function type from event shape
  const functionType = detectFunctionType(event);

  switch (functionType) {
    case 'evaluateApproval': {
      const fraudFlagged = event.fraudFlagged || false;
      const severityRating = event.severityRating || 'Low';
      const estimatedRepairCost = event.estimatedRepairCost || 0;

      // Auto-approval: no fraud + low severity + under cost threshold
      if (fraudFlagged) {
        return { claimId, decision: 'fraud_flagged', reason: 'Claim has an active fraud flag' };
      }
      if (SEVERITY_ORDER[severityRating] > SEVERITY_ORDER['Low']) {
        return { claimId, decision: 'pending_adjuster', reason: 'Severity ' + severityRating + ' exceeds auto-approval threshold' };
      }
      if (estimatedRepairCost > 2000) {
        return { claimId, decision: 'pending_adjuster', reason: 'Cost ' + estimatedRepairCost + ' exceeds auto-approval threshold' };
      }
      return { claimId, decision: 'approved', reason: 'Auto-approved: low severity, within cost threshold' };
    }

    case 'runPayout': {
      return {
        claimId,
        newClaimStatus: 'Paid',
        paymentInitiated: true,
        idempotencyKey: claimId,
        timestamp: new Date().toISOString(),
      };
    }

    case 'notifyCustomer': {
      const status = event.newClaimStatus || event.status || 'Approved';
      const channel = event.originalChannel || 'Email';
      const messages = {
        Approved: 'Your claim has been approved.',
        Denied: 'Your claim has been denied.',
        Paid: 'Payment for your claim has been processed.',
        Resolved: 'Your dispute has been resolved.',
      };
      return {
        claimId,
        notified: true,
        channel,
        status,
        message: messages[status] || 'Your claim status has been updated to ' + status,
      };
    }

    default:
      return { claimId, decision: 'approved', reason: 'Default pass-through' };
  }
};

function detectFunctionType(event) {
  if (event.decision === 'approved' || event.paymentInitiated !== undefined) return 'runPayout';
  if (event.notified || event.newClaimStatus) return 'notifyCustomer';
  return 'evaluateApproval';
}
