/**
 * Lambda handler entry point for the FNOL Intake Agent.
 *
 * Routes incoming events to the appropriate channel normalizer,
 * session lookup/resume, and field extraction logic.
 */
import { normalizeVoiceMessage, normalizeEmailMessage, normalizeChatMessage } from './channels';
import { lookupClaimSession, resumeSession, getPendingFields } from './session';
import { DynamoClaimSessionsTable } from './claimSessions';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sessionsTable = new DynamoClaimSessionsTable({ documentClient });

export async function handler(event: any): Promise<any> {
  // If this is a Cognito trigger event, return the event as-is
  if (event.triggerSource) {
    return event;
  }

  const { channel, action } = event;

  try {
    // Channel normalization
    if (action === 'normalize') {
      switch (channel) {
        case 'Voice':
          return { statusCode: 200, body: normalizeVoiceMessage(event.segments || [], event.options) };
        case 'Email':
          return { statusCode: 200, body: normalizeEmailMessage(event.payload) };
        case 'Chat':
          return { statusCode: 200, body: normalizeChatMessage(event.payload) };
        default:
          return { statusCode: 400, body: { error: `Unknown channel: ${channel}` } };
      }
    }

    // Session lookup
    if (action === 'lookupSession') {
      const key = event.claimId
        ? { type: 'claimId' as const, claimId: event.claimId }
        : { type: 'policyNumber' as const, policyNumber: event.policyNumber };

      const result = await lookupClaimSession(key, sessionsTable);
      return { statusCode: 200, body: result };
    }

    // Session resume
    if (action === 'resumeSession') {
      const key = event.claimId
        ? { type: 'claimId' as const, claimId: event.claimId }
        : { type: 'policyNumber' as const, policyNumber: event.policyNumber };

      const getCapturedFields = async () => event.capturedFields || {
        policyNumber: { value: null, confidenceScore: null, confirmed: false },
        incidentDate: { value: null, confidenceScore: null, confirmed: false },
        incidentLocation: { value: null, confidenceScore: null, confirmed: false },
        damageDescription: { value: null, confidenceScore: null, confirmed: false },
      };

      const result = await resumeSession(key, sessionsTable, getCapturedFields, event.threshold || 0.75);
      return { statusCode: 200, body: result };
    }

    // Default: return event info
    return {
      statusCode: 200,
      body: { message: 'Intake agent ready', event },
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: { error: error.message },
    };
  }
}
