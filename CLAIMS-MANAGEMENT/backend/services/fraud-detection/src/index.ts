/**
 * @claims/fraud-detection
 *
 * Fraud Detection Service: evaluates claim frequency, timeline consistency,
 * and sanctions/watchlist screening to produce Fraud_Indicators and apply
 * Fraud_Flags to Claims.
 *
 * Placeholder module populated by task 1.1 (project scaffolding). Detection
 * and aggregation logic are implemented in later tasks (10.x).
 */
export const FRAUD_DETECTION_PACKAGE_NAME = '@claims/fraud-detection';

export * from './screening';

export * from './checks';
