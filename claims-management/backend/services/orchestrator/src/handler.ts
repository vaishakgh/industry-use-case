/**
 * Lambda handler entry point for Orchestrator functions.
 *
 * Handles EvaluateApproval, RunPayout, and NotifyCustomer based on
 * the event shape.
 */
import { evaluateAutoApproval } from './lifecycle/autoApproval';
import { checkPayoutEligibility } from './lifecycle/payoutSuspension';
import { executePayout, type PaymentClient } from './lifecycle/payoutIdempotency';
import { buildCustomerNotification } from './lifecycle/notifyCustomer';
import { recordAdjusterDecision } from './lifecycle/adjusterDecision';
import { DEFAULT_SYSTEM_CONFIG } from '@claims/shared';

/**
 * Mock payment client for dev — always succeeds.
 * In production, replace with real payment provider.
 */
const mockPaymentClient: PaymentClient = {
  initiatePayment: async (idempotencyKey: string, amount: number) => true,
};

export async function handler(event: any): Promise<any> {
  const claimId = event.claimId || 'unknown';
  const config = DEFAULT_SYSTEM_CONFIG;

  try {
    // Determine function from event context
    const functionType = event.functionType || detectFunctionType(event);

    switch (functionType) {
      case 'evaluateApproval': {
        const input = {
          fraudFlag: event.fraudFlagged || false,
          severityRating: event.severityRating || 'Low',
          estimatedRepairCost: event.estimatedRepairCost || 0,
        };

        const decision = evaluateAutoApproval(input, config);

        if (decision.approved) {
          // Check payout eligibility (fraud suspension)
          const eligibility = checkPayoutEligibility({
            fraudFlag: event.fraudFlagged || false,
            fraudAnalystId: event.fraudAnalystId || null,
          });

          if (!eligibility.eligible) {
            return { claimId, decision: 'fraud_flagged', reason: eligibility.reason };
          }

          return { claimId, decision: 'approved', reason: 'Auto-approved' };
        }

        return { claimId, decision: 'pending_adjuster', reason: decision.approved ? '' : (decision as any).reason };
      }

      case 'runPayout': {
        const result = await executePayout(
          { claimId, approvedAmount: event.estimatedRepairCost || event.approvedAmount || 0 },
          mockPaymentClient,
        );
        return result;
      }

      case 'notifyCustomer': {
        const notification = buildCustomerNotification(
          claimId,
          event.originalChannel || 'Email',
          event.newClaimStatus || event.status || 'Approved',
        );
        return { claimId, notified: true, notification };
      }

      case 'adjusterDecision': {
        const result = recordAdjusterDecision({
          claimId,
          adjusterId: event.adjusterId,
          decision: event.adjusterDecision,
        });
        return result;
      }

      default:
        return { claimId, decision: 'approved', reason: 'Default pass-through' };
    }
  } catch (error: any) {
    return { claimId, error: error.message };
  }
}

function detectFunctionType(event: any): string {
  if (event.decision === 'approved' || event.paymentInitiated !== undefined) return 'runPayout';
  if (event.notified || event.newClaimStatus) return 'notifyCustomer';
  if (event.adjusterDecision) return 'adjusterDecision';
  return 'evaluateApproval';
}
