/**
 * @claims/shared
 *
 * Shared domain types, enums, configuration loading, and cross-cutting
 * utilities used by every subsystem in the Claims Management and FNOL
 * system (intake-agent, damage-assessment, fraud-detection, orchestrator,
 * audit-log, portal).
 *
 * Domain types and enums (task 1.2) are exported below. The config loader
 * (task 1.3) is implemented in a subsequent task.
 */
export const SHARED_PACKAGE_NAME = '@claims/shared';

export * from './types';

export * from './config';

export * from './upload';
