// Intake Agent Lambda handler (standalone, no workspace imports)
exports.handler = async (event) => {
  // Cognito trigger events
  if (event.triggerSource) {
    return event;
  }

  const channel = event.channel || 'Chat';
  const action = event.action || 'process';

  if (action === 'normalize') {
    // Channel normalization
    const rawText = event.rawText || event.message || '';
    return {
      statusCode: 200,
      body: {
        channel,
        rawText: rawText.trim(),
        claimIdHint: event.claimId || undefined,
        policyNumberHint: event.policyNumber || undefined,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Default: return processing acknowledgment
  return {
    statusCode: 200,
    body: {
      message: 'Intake agent ready',
      channel,
      claimId: event.claimId || null,
    },
  };
};
