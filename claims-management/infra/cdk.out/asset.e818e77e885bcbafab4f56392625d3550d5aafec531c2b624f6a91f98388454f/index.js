// Audit Log Lambda handler (standalone, no workspace imports)
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.AUDIT_LOG_TABLE_NAME || 'claims-audit-log-dev';

exports.handler = async (event) => {
  const action = event.action || 'record';

  try {
    if (action === 'record') {
      const logId = 'LOG-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const record = {
        logId,
        claimId: event.claimId || 'unknown',
        decisionType: event.decisionType || 'Approval',
        inputs: event.inputs || {},
        confidenceScore: event.confidenceScore || null,
        fraudIndicators: event.fraudIndicators || null,
        timestamp: event.timestamp || new Date().toISOString(),
        actorType: event.actorType || 'System',
        actorId: event.actorId || null,
      };

      await client.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: record,
        ConditionExpression: 'attribute_not_exists(logId)',
      }));

      return { statusCode: 200, body: record };
    }

    if (action === 'query') {
      const result = await client.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'ClaimIdIndex',
        KeyConditionExpression: 'claimId = :claimId',
        ExpressionAttributeValues: { ':claimId': event.claimId },
      }));
      return { statusCode: 200, body: { records: result.Items || [] } };
    }

    return { statusCode: 400, body: { error: 'Unknown action: ' + action } };
  } catch (error) {
    return { statusCode: 500, body: { error: error.message } };
  }
};
