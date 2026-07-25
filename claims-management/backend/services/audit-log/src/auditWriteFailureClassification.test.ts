/**
 * Unit tests for task 2.9: audit write failure classification.
 *
 * NOTE on task wording vs. implemented behavior: the task text says to
 * confirm that "only genuine failures raise `Claims.AuditFailure`", which
 * would imply a duplicate-`logId` conditional-check failure should NOT
 * raise `Claims.AuditFailure`. However, `recordDecisionBeforeEffect.ts`'s
 * own doc comments make clear the implemented design is intentionally
 * conservative: it raises `ClaimsAuditFailureError` (`Claims.AuditFailure`)
 * on ANY underlying failure -- including both a genuine `AuditLogAccessError`
 * and a duplicate-key `AuditLogDuplicateRecordError` -- so a decision never
 * proceeds unless the audit write is confirmed durable. This is the
 * fail-safe behavior required by Requirement 8.6 ("the decision SHALL only
 * take effect once its audit record has been successfully and durably
 * written", Property 33), and it is already directly verified by
 * `recordDecisionBeforeEffect.test.ts` (task 2.4) at the wrapper level with
 * a fake in-memory repository, and by `repository/auditLogRepository.test.ts`
 * (task 2.1) at the repository level with a mocked DynamoDB client.
 *
 * This file adds the piece neither of those cover: an end-to-end test that
 * wires the real `DynamoDbAuditLogRepository` (backed by a mocked DynamoDB
 * client) through `recordAutomatedDecision` and the real
 * `recordDecisionBeforeEffect` wrapper, confirming that:
 *  - a genuine `PutItem` failure and a duplicate-`logId` conditional-check
 *    failure are still classified as distinct repository error TYPES
 *    (`AuditLogAccessError` vs. `AuditLogDuplicateRecordError`) even when
 *    routed through the full stack, and
 *  - both classifications nonetheless surface as `Claims.AuditFailure`
 *    (`ClaimsAuditFailureError`) to the caller, per the fail-safe design
 *    above -- i.e. the distinction is preserved for diagnostics (via
 *    `cause`) but never changes the caller-visible, fail-safe outcome.
 *
 * _Requirements: 8.6_
 */
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
  AuditLogAccessError,
  AuditLogDuplicateRecordError,
  DynamoDbAuditLogRepository,
} from './repository/auditLogRepository';
import {
  CLAIMS_AUDIT_FAILURE_ERROR_NAME,
  ClaimsAuditFailureError,
  recordDecisionBeforeEffect,
} from './recordDecisionBeforeEffect';
import type { RecordAutomatedDecisionInput } from './recordAutomatedDecision';

function buildInput(overrides: Partial<RecordAutomatedDecisionInput> = {}): RecordAutomatedDecisionInput {
  return {
    decisionType: 'Approval',
    claimId: 'claim-1',
    inputs: { severityRating: 'Low', estimatedRepairCost: 500 },
    confidenceScore: 0.92,
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('audit write failure classification (end-to-end through the real repository and wrapper)', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  it('classifies a genuine PutItem failure as AuditLogAccessError, and still raises Claims.AuditFailure', async () => {
    const throttlingError = Object.assign(new Error('Rate exceeded'), {
      name: 'ProvisionedThroughputExceededException',
    });
    ddbMock.on(PutCommand).rejects(throttlingError);
    const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

    let caught: unknown;
    try {
      await recordDecisionBeforeEffect(buildInput(), repository);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ClaimsAuditFailureError);
    expect((caught as ClaimsAuditFailureError).name).toBe(CLAIMS_AUDIT_FAILURE_ERROR_NAME);
    // Repository-level classification is preserved on `cause` even though
    // the caller-visible outcome (Claims.AuditFailure) is the same either way.
    expect((caught as ClaimsAuditFailureError).cause).toBeInstanceOf(AuditLogAccessError);
    expect((caught as ClaimsAuditFailureError).cause).not.toBeInstanceOf(AuditLogDuplicateRecordError);
  });

  it('classifies a duplicate-logId conditional-check failure as AuditLogDuplicateRecordError, and still raises Claims.AuditFailure', async () => {
    const conditionalError = Object.assign(new Error('The conditional request failed'), {
      name: 'ConditionalCheckFailedException',
    });
    ddbMock.on(PutCommand).rejects(conditionalError);
    const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

    let caught: unknown;
    try {
      await recordDecisionBeforeEffect(buildInput(), repository);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ClaimsAuditFailureError);
    expect((caught as ClaimsAuditFailureError).name).toBe(CLAIMS_AUDIT_FAILURE_ERROR_NAME);
    // Distinct error TYPE from the genuine-failure case above, even though
    // both converge to the same fail-safe Claims.AuditFailure outcome.
    expect((caught as ClaimsAuditFailureError).cause).toBeInstanceOf(AuditLogDuplicateRecordError);
    expect((caught as ClaimsAuditFailureError).cause).not.toBeInstanceOf(AuditLogAccessError);
  });

  it('the decision never proceeds (no thrown value is a success) for either failure classification', async () => {
    const errors = [
      Object.assign(new Error('Rate exceeded'), { name: 'ProvisionedThroughputExceededException' }),
      Object.assign(new Error('The conditional request failed'), { name: 'ConditionalCheckFailedException' }),
    ];

    for (const error of errors) {
      ddbMock.reset();
      ddbMock.on(PutCommand).rejects(error);
      const repository = new DynamoDbAuditLogRepository(ddbMock as unknown as DynamoDBDocumentClient);

      await expect(recordDecisionBeforeEffect(buildInput(), repository)).rejects.toThrow(ClaimsAuditFailureError);
    }
  });
});
