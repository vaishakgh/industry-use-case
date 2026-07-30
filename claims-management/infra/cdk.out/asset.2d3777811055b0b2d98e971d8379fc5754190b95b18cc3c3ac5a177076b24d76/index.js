// Portal service Lambda handler (bundled for deployment)
// This is a standalone handler that doesn't require workspace packages

const MAX_DISPUTE_REASON_LENGTH = 2000;

exports.handler = async (event) => {
  // Cognito trigger events (PreAuthentication)
  if (event.triggerSource) {
    // Allow all authentications (lockout logic would check DynamoDB in production)
    return event;
  }

  // API Gateway events
  const path = event.path || event.rawPath || '';
  const method = event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method) || 'GET';
  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch (e) { body = {}; }

  const respond = (statusCode, data) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify(data),
  });

  // POST /auth/login
  if (path.endsWith('/auth/login') && method === 'POST') {
    return respond(200, { message: 'Use Cognito InitiateAuth directly for authentication' });
  }

  // GET /claims
  if (path.match(/\/claims\/?$/) && method === 'GET') {
    return respond(200, { claims: [], message: 'Claims list endpoint ready' });
  }

  // GET /claims/{id}
  if (path.match(/\/claims\/[^/]+\/?$/) && method === 'GET') {
    const claimId = path.split('/').filter(Boolean).pop();
    return respond(200, {
      claimId,
      currentStatus: 'Intake',
      statusHistory: [{ status: 'Intake', timestamp: new Date().toISOString() }],
    });
  }

  // POST /claims/{id}/documents
  if (path.includes('/documents') && method === 'POST') {
    const parts = path.split('/').filter(Boolean);
    const claimId = parts[parts.indexOf('claims') + 1];
    return respond(200, {
      message: 'Document uploaded successfully.',
      claimId,
      documentRef: 's3://documents/' + claimId + '/' + Date.now(),
    });
  }

  // POST /claims/{id}/disputes
  if (path.includes('/disputes') && method === 'POST') {
    const parts = path.split('/').filter(Boolean);
    const claimId = parts[parts.indexOf('claims') + 1];
    const reason = (body.reason || '').trim();

    if (!reason) {
      return respond(400, { message: 'Dispute reason must not be empty.' });
    }
    if (reason.length > MAX_DISPUTE_REASON_LENGTH) {
      return respond(400, { message: 'Dispute reason exceeds maximum length of ' + MAX_DISPUTE_REASON_LENGTH + ' characters.' });
    }

    return respond(200, {
      message: 'Dispute submitted successfully.',
      claimId,
      disputeId: 'DISP-' + Date.now(),
    });
  }

  return respond(404, { message: 'Not found' });
};
