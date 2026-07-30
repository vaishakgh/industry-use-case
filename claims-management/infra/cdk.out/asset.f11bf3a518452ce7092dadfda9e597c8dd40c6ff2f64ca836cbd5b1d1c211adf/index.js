// Portal service Lambda handler (stub for deployment)
// Cognito PreAuthentication trigger must return the event object
exports.handler = async (event) => {
  // If this is a Cognito trigger event, return the event as-is (allow auth)
  if (event.triggerSource) {
    return event;
  }
  // Otherwise handle as API Gateway request
  return { statusCode: 200, body: JSON.stringify({ message: 'OK' }) };
};
