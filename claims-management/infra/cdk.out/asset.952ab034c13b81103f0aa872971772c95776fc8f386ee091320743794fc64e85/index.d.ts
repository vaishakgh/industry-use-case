/**
 * @claims/orchestrator
 *
 * Claims Orchestrator: drives each Claim through its lifecycle stages
 * (Intake -> Assessment -> Fraud_Check -> Payout/Disputed), implementing
 * the ClaimLifecycleWorkflow and DisputeResolutionWorkflow state machine
 * logic, retry/backoff classification, and terminal-status notification.
 *
 * The `Claims` table access layer (task 3.1) is exported below. Lifecycle
 * state machine logic is implemented in later tasks (12.x, 14.x).
 */
export declare const ORCHESTRATOR_PACKAGE_NAME = "@claims/orchestrator";
export * from './repository/claimsRepository';
export * from './lifecycle';
export * from './dispute';
//# sourceMappingURL=index.d.ts.map