/**
 * Lambda handler entry point for the Audit Log Service.
 *
 * Records automated decisions and provides audit history queries.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDbAuditLogRepository } from './repository/auditLogRepository';
import { recordAutomatedDecision } from './recordAutomatedDecision';
import { getAuditHistoryHandler } from './handlers/getAuditHistoryHandler';

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const repository = new DynamoDbAuditLogRepository(documentClient);

export async function handler(event: any): Promise<any> {
  const action = event.action || 'record';

  try {
    if (action === 'record') {
      const record = await recordAutomatedDecision(event, repository);
      return { statusCode: 200, body: record };
    }

    if (action === 'query') {
      const result = await getAuditHistoryHandler(event, repository);
      return result;
    }

    return { statusCode: 400, body: { error: `Unknown action: ${action}` } };
  } catch (error: any) {
    return { statusCode: 500, body: { error: error.message } };
  }
}
