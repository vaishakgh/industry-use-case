/**
 * @claims/fraud-detection
 *
 * Fraud Detection Service: evaluates claim frequency, timeline consistency,
 * and sanctions/watchlist screening to produce Fraud_Indicators and apply
 * Fraud_Flags to Claims.
 */
export const FRAUD_DETECTION_PACKAGE_NAME = '@claims/fraud-detection';

export * from './screening';

export * from './checks';

export { resolveFraudReview } from './resolveFraudReview';
export type {
  FraudAnalystDecision,
  ResolveFraudReviewInput,
  FraudReviewResolution,
} from './resolveFraudReview';

export { recordFraudFlagDecision, recordFraudAnalystDecision } from './auditIntegration';
export type { RecordFraudDecisionFn } from './auditIntegration';
