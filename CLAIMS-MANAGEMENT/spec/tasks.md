# Implementation Plan: Claims Management and FNOL System

## Overview

This plan implements the five cooperating subsystems from the design (FNOL Intake Agent on Bedrock AgentCore, Damage Assessment via Rekognition, Fraud Detection, Claims Orchestrator via Step Functions, and the Customer Portal via Amplify/Cognito) as TypeScript/Node.js Lambda services with shared DynamoDB-backed data models. Work proceeds bottom-up: shared types/config and the Audit Log Service first (since every decision-producing component must write through it before a decision can take effect, per Requirement 8.6), then the Claims/Claim_Session data layer, then each subsystem in turn, then the Claims Orchestrator that ties the lifecycle together, then the Dispute Resolution workflow and Customer Portal, and finally the PII-authorization cross-cutting concern. Property-based tests (fast-check, minimum 100 iterations, tagged with their design property number) are placed immediately after the logic they validate. Infrastructure wiring (Transcribe/Rekognition/watchlist API calls, KMS/TLS config, Cognito authorizer presence, audit-table IAM immutability) is out of scope for PBT per the design and is covered by unit/integration tests instead, called out inline where relevant.

## Tasks

- [x] 1. Set up project structure and shared foundations
  - [x] 1.1 Initialize project structure and TypeScript/Lambda build configuration
    - Create a monorepo-style layout with one package per subsystem (`intake-agent`, `damage-assessment`, `fraud-detection`, `orchestrator`, `audit-log`, `portal`) plus a `shared` package
    - Configure TypeScript, linting, and the test runner (Jest) with `fast-check` as a dependency for property-based tests
    - _Requirements: (foundational, supports all requirements)_

  - [x] 1.2 Define shared domain types and enums
    - Implement TypeScript types for `Claim`, `ClaimSession`, `AuditLogRecord`, `DisputeRecord`, and the `Claim_Status`, `Severity_Rating`, `decisionType`, and role enums from the Data Models section
    - _Requirements: 1.4, 2.1, 7.6, 8.1_

  - [x] 1.3 Implement configuration loader for SystemConfig values
    - Load `transcriptionConfidenceThreshold`, `fieldConfidenceThreshold`, `maxClarifyingAttempts`, `maxVoiceRetries`, `maxConfirmAttempts`, `maxPhotosPerClaim`, `supportedImageFormats`, `maxPhotoFileSizeBytes`, `maxPhotoResubmissions`, `damageAssessmentConfidenceThreshold`, `autoApprovalThreshold`, `fraudFrequencyThreshold`/`fraudFrequencyWindow`, `stageRetryMaxAttempts`, `stageRetryBackoffSeconds`, `auditRetentionPeriod`, `sessionTimeoutMinutes`, `maxDisputeReasonLength`, `supportedDocumentFormats`, `maxDocumentFileSizeBytes`
    - _Requirements: 1.5, 1.6, 2.3, 2.4, 4.1, 4.4, 4.5, 4.6, 6.1, 7.2, 9.6, 10.2, 11.5_

  - [ ]* 1.4 Write unit tests for configuration loader
    - Test default values and configured-range validation (e.g., `sessionTimeoutMinutes` within 5-30)
    - _Requirements: 9.6_

- [ ] 2. Implement Audit Log Service
  - [x] 2.1 Implement AuditLog DynamoDB access layer
    - Implement append-only `PutItem` with `ConditionExpression: attribute_not_exists(LogId)` and a `ClaimIdIndex` GSI query helper
    - _Requirements: 8.2, 8.4_

  - [x] 2.2 Implement `recordAutomatedDecision` Lambda handler
    - Accept decision type, inputs, confidence score, claim id, timestamp, and optional fraud indicators/actor fields, and persist via the access layer from 2.1
    - _Requirements: 8.1, 8.3_

  - [ ]* 2.3 Write property test for audit record completeness
    - **Property 30: Automated decision audit completeness**
    - **Validates: Requirements 8.1, 8.3**

  - [x] 2.4 Implement audit-write-precedes-effect wrapper
    - Implement a helper that decision-producing components call: it invokes `recordAutomatedDecision` synchronously and only returns success (allowing the caller to apply its side effect) if the write succeeds; on failure it raises `Claims.AuditFailure`
    - _Requirements: 8.6_

  - [ ]* 2.5 Write property test for audit-write-precedes-effect
    - **Property 33: Audit write precedes decision effect**
    - **Validates: Requirements 8.6**

  - [ ] 2.6 Implement `GET /audit/claims/{claimId}` query handler
    - Query the `ClaimIdIndex` GSI in chronological order and gate access on a compliance-officer group claim from the Lambda authorizer, returning 403 for unauthorized requesters
    - _Requirements: 8.4, 8.5_

  - [ ]* 2.7 Write property test for chronological per-claim audit retrieval
    - **Property 31: Chronological per-claim audit retrieval**
    - **Validates: Requirements 8.4**

  - [ ]* 2.8 Write property test for audit history access restriction
    - **Property 32: Audit history access restricted to compliance officers**
    - **Validates: Requirements 8.5**

  - [ ]* 2.9 Write unit tests for audit write failure classification
    - Cover a genuine `PutItem` failure vs. a duplicate-`logId` conditional-check failure, confirming only genuine failures raise `Claims.AuditFailure`
    - _Requirements: 8.6_

- [x] 3. Implement Claims and Claim_Session data access layer
  - [x] 3.1 Implement Claims table access layer
    - Implement get/put/update operations and a `statusHistory` append operation that adds exactly one `{status, timestamp}` entry per call, preserving prior entries
    - _Requirements: 7.6_

  - [x]* 3.2 Write property test for status transition history invariant
    - **Property 28: Status transition history invariant**
    - **Validates: Requirements 7.6**

  - [x] 3.3 Implement ClaimSessions table access layer
    - Implement get/put/update operations plus a `PolicyNumberStatusIndex` GSI query (PK `policyNumber`, SK `claimStatus`) for cross-channel and disambiguation lookups
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 3.4 Implement Claim ID generation and uniqueness guarantee
    - Generate ULID-based `Claim_ID`s and enforce uniqueness via a conditional `PutItem` on claim creation
    - _Requirements: 1.4_

  - [x]* 3.5 Write property test for unique claim creation
    - **Property 1: Unique claim creation on new session**
    - **Validates: Requirements 1.4**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement shared evidence upload validation
  - [x] 5.1 Implement upload validator for format/size
    - Implement a shared validator (used by both damage-photo and portal-document uploads) that checks a file's format against a configured supported-format set and its size against a configured maximum before any S3 write, returning the specific violated limit
    - _Requirements: 4.4, 4.5, 10.2, 10.3_

  - [x]* 5.2 Write property test for upload validation
    - **Property 17: Upload validation rejects unsupported or oversized files**
    - **Validates: Requirements 4.4, 4.5, 10.2, 10.3**

- [ ] 6. Implement FNOL Intake Agent - channel normalization and session continuity
  - [x] 6.1 Implement `ChannelMessage` normalization for Voice/Email/Chat adapters
    - Normalize all three channels into `{channel, rawText, claimIdHint?, policyNumberHint?, timestamp}` before invoking agent logic
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 6.2 Implement Voice adapter with confidence-based confirmation and retry counter
    - Integrate Amazon Transcribe segment confidence scores; prompt for confirm/restate below `transcriptionConfidenceThreshold`; track `voiceRetryCount` for unintelligible audio
    - _Requirements: 1.1, 1.5, 1.6_

  - [ ] 6.5 Implement Email/Chat adapters with unparseable-content handling
    - Detect when no claim-relevant content can be extracted and respond by asking the customer to resubmit or clarify, without creating/advancing a Claim
    - _Requirements: 1.2, 1.3, 1.7_

  - [ ] 6.7 Implement `lookupClaimSession` tool
    - Query by `Claim_ID` or policy number against the `ClaimSessions` GSI, returning zero, one, or many matches with `Claim_Status = Intake`
    - _Requirements: 3.1, 3.4, 3.5_

  - [ ]* 6.3 Write property test for low-confidence transcription confirmation
    - **Property 2: Low-confidence transcription triggers confirmation**
    - **Validates: Requirements 1.5**

  - [ ]* 6.4 Write property test for voice retry exhaustion
    - **Property 3: Voice retry exhaustion offers a channel switch**
    - **Validates: Requirements 1.6**

  - [ ]* 6.6 Write property test for unparseable content handling
    - **Property 4: Unparseable content requests resubmission**
    - **Validates: Requirements 1.7**

  - [ ]* 6.8 Write property test for unknown claim reference
    - **Property 13: Unknown claim reference yields a not-found response**
    - **Validates: Requirements 3.4**

  - [ ]* 6.9 Write property test for ambiguous policy number disambiguation
    - **Property 14: Ambiguous policy number match triggers disambiguation**
    - **Validates: Requirements 3.5**

  - [ ] 6.10 Implement session resume logic
    - Retrieve previously captured `Structured_Claim_Fields` on resume and suppress re-requesting fields already marked confirmed
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 6.11 Write property test for session resume preserving captured fields
    - **Property 11: Session resume preserves captured fields**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 6.12 Write property test for confirmed fields never re-requested
    - **Property 12: Confirmed fields are never re-requested on resume**
    - **Validates: Requirements 3.3**

- [ ] 7. Implement FNOL Intake Agent - structured field extraction and clarification
  - [ ] 7.1 Implement `extractFields` tool
    - Extract policy number, incident date, incident location, and damage description with a `Confidence_Score` in [0, 1] for each extracted value
    - _Requirements: 2.1, 2.2_

  - [ ]* 7.2 Write property test for structured field extraction completeness
    - **Property 6: Structured field extraction completeness**
    - **Validates: Requirements 2.1, 2.2**

  - [ ] 7.3 Implement per-field clarification attempt counter and escalation
    - Ask a clarifying question while the per-field attempt count is below `maxClarifyingAttempts` (3); route to a Human_Adjuster once exhausted without resolution
    - _Requirements: 2.3, 2.6_

  - [ ] 7.5 Implement confidence-threshold confirmation and rejection re-request handling
    - Require explicit confirmation when `Confidence_Score` is below `fieldConfidenceThreshold`; on rejection, discard the value/score and re-request with fresh extraction
    - _Requirements: 2.4, 2.7_

  - [ ] 7.8 Implement confirm/restate attempt counter and adjuster escalation
    - Track confirm/restate attempts (Requirement 1.5 flow) and route to a Human_Adjuster once `maxConfirmAttempts` is reached without resolution
    - _Requirements: 1.8_

  - [ ]* 7.4 Write property test for field clarification attempt lifecycle
    - **Property 7: Field clarification attempt lifecycle**
    - **Validates: Requirements 2.3, 2.6**

  - [ ]* 7.6 Write property test for below-threshold confidence confirmation
    - **Property 8: Below-threshold confidence requires confirmation**
    - **Validates: Requirements 2.4**

  - [ ]* 7.7 Write property test for rejected value resetting confirmation state
    - **Property 10: Rejected value resets confirmation state**
    - **Validates: Requirements 2.7**

  - [ ]* 7.9 Write property test for confirmation attempt exhaustion routing to adjuster
    - **Property 5: Confirmation attempt exhaustion routes to an adjuster**
    - **Validates: Requirements 1.8**

  - [ ] 7.10 Implement all-fields-resolved transition to Assessment
    - Transition `Claim_Status` to `Assessment` and persist all four field values only once each field is above-threshold or confirmed
    - _Requirements: 2.5_

  - [ ]* 7.11 Write property test for all-fields-resolved transition
    - **Property 9: All fields resolved transitions to Assessment**
    - **Validates: Requirements 2.5**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Damage Assessment Service
  - [ ] 9.1 Implement photo upload Lambda
    - Reuse the shared upload validator (5.1) and enforce `maxPhotosPerClaim`, rejecting uploads once the maximum is reached
    - _Requirements: 4.1_

  - [ ]* 9.2 Write property test for photo upload count maximum
    - **Property 15: Photo upload count respects the configured maximum**
    - **Validates: Requirements 4.1**

  - [ ] 9.3 Implement Rekognition analysis aggregation
    - Using a mocked Rekognition client injected at the boundary, aggregate per-photo results into a single `Severity_Rating`, estimated repair cost, and `Confidence_Score`, and store them on the Claim
    - _Requirements: 4.2, 4.3_

  - [ ]* 9.4 Write property test for damage assessment aggregation round-trip
    - **Property 16: Damage assessment aggregation and storage round-trip**
    - **Validates: Requirements 4.2, 4.3**

  - [ ] 9.5 Implement resubmission counter and escalation-to-adjuster lifecycle
    - Track `photoResubmissionCount`; request clearer photos below the configured max; escalate to `Pending_Adjuster_Review` when the max is exhausted, or immediately on a non-quality failure or below-threshold confidence
    - _Requirements: 4.6, 4.7_

  - [ ]* 9.6 Write property test for resubmission-then-escalation lifecycle
    - **Property 18: Photo resubmission-then-escalation lifecycle**
    - **Validates: Requirements 4.6, 4.7**

  - [ ] 9.7 Wire Damage Assessment decisions through the Audit Log Service
    - Call the 2.4 audit-write-precedes-effect wrapper before applying the assessment result to the Claim
    - _Requirements: 8.1, 8.6_

- [ ] 10. Implement Fraud Detection Service
  - [x] 10.1 Implement claim frequency check
    - Query claim history within the configured `fraudFrequencyWindow` and identify a frequency `Fraud_Indicator` when the count exceeds `fraudFrequencyThreshold`
    - _Requirements: 6.1_

  - [ ]* 10.2 Write property test for claim frequency fraud indicator threshold
    - **Property 21: Claim frequency fraud indicator threshold**
    - **Validates: Requirements 6.1**

  - [ ] 10.3 Implement timeline discrepancy check
    - Cross-validate incident date, incident location, and event-sequence metadata for internal inconsistency
    - _Requirements: 6.2_

  - [ ]* 10.4 Write property test for timeline discrepancy fraud indicator
    - **Property 22: Timeline discrepancy fraud indicator**
    - **Validates: Requirements 6.2**

  - [x] 10.5 Implement mocked watchlist/sanctions screening client interface
    - Define the screening interface abstraction and a mock implementation for use in aggregation logic and tests
    - _Requirements: 6.3_

  - [ ] 10.6 Implement fraud flag aggregation from indicators
    - Apply a `Fraud_Flag` if and only if the identified indicator set is non-empty, recording every indicator with its confidence score
    - _Requirements: 6.4_

  - [ ]* 10.7 Write property test for fraud flag aggregation
    - **Property 23: Fraud flag aggregation from indicators**
    - **Validates: Requirements 6.4**

  - [ ] 10.8 Implement `resolveFraudReview` handler
    - Record the Fraud_Analyst's identity and decision; either clear the flag and signal resume at Fraud_Check, or set `Claim_Status` to `Denied`
    - _Requirements: 6.6_

  - [ ]* 10.9 Write property test for fraud analyst decision resolution
    - **Property 25: Fraud analyst decision resolution**
    - **Validates: Requirements 6.6**

  - [ ] 10.10 Wire Fraud Detection decisions through the Audit Log Service
    - Call the 2.4 audit-write-precedes-effect wrapper before applying a fraud flag or analyst decision
    - _Requirements: 8.1, 8.3, 8.6_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement Claims Orchestrator lifecycle and approval logic
  - [ ] 12.1 Implement `ClaimLifecycleWorkflow` Step Functions state machine definition
    - Define states per the Architecture diagram: `AwaitIntakeCompletion`, `RunDamageAssessment`, `RunFraudCheck`, `EvaluateApproval`, `AwaitFraudAnalystDecision`, `AwaitAdjusterDecision`, `RunPayout`, and the `EscalateToAdjuster_*` states, using `waitForTaskToken` for human/agent-in-the-loop stages and one execution per `Claim_ID`
    - _Requirements: 7.1_

  - [ ] 12.3 Implement lifecycle stage sequencing model/validator
    - Implement a pure function that, given a sequence of stage-completion events, computes the resulting `Claim_Status` sequence and rejects any transition not permitted by the lifecycle graph
    - _Requirements: 7.1, 7.4, 7.5, 7.7_

  - [ ]* 12.4 Write property test for lifecycle stage ordering conformance
    - **Property 26: Lifecycle stage ordering conformance**
    - **Validates: Requirements 7.1, 7.4, 7.5, 7.7**

  - [ ] 12.5 Implement stage retry/backoff and persistent-failure escalation
    - Classify failures into `Claims.TransientFailure`/`Claims.PersistentFailure`; retry transient failures with the configured backoff up to `stageRetryMaxAttempts` (3); escalate to `Pending_Adjuster_Review` on exhaustion
    - _Requirements: 7.2, 7.3_

  - [ ]* 12.6 Write property test for retry-then-escalate behavior
    - **Property 27: Retry-then-escalate on persistent failure**
    - **Validates: Requirements 7.2, 7.3**

  - [ ] 12.7 Implement `EvaluateApproval` auto-approval decision logic
    - Implement the decision table over `(fraudFlag, severityRating, estimatedRepairCost)` against the `Auto_Approval_Threshold`
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 12.8 Write property test for auto-approval decision table
    - **Property 19: Auto-approval decision table**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ] 12.9 Implement payout suspension check for fraud-flagged claims
    - Prevent the Payout stage from executing while `fraudFlag` is true and no analyst decision is recorded
    - _Requirements: 6.5_

  - [ ]* 12.10 Write property test for payout suspension while fraud-flagged
    - **Property 24: Payout suspension while fraud-flagged**
    - **Validates: Requirements 6.5**

  - [ ] 12.11 Implement adjuster decision recording handler
    - Set `Claim_Status` to `Approved` or `Denied` per the adjuster's decision and record the adjuster's identity in both cases
    - _Requirements: 5.4, 5.5_

  - [ ]* 12.12 Write property test for adjuster decision recording
    - **Property 20: Adjuster decision recording**
    - **Validates: Requirements 5.4, 5.5**

  - [ ] 12.13 Implement Notify Customer Lambda
    - Look up `originalChannel` on the Claim and deliver terminal-status notifications through that channel for `Approved`, `Denied`, `Paid`, and `Resolved`
    - _Requirements: 7.8_

  - [ ]* 12.14 Write property test for terminal status notification channel routing
    - **Property 29: Terminal status notification uses the original channel**
    - **Validates: Requirements 7.8**

  - [ ] 12.15 Implement payout idempotency and Paid transition
    - Use `Claim_ID` as a `payoutIdempotencyKey` on the payment-initiation call and set `Claim_Status` to `Paid` on success
    - _Requirements: 7.7_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement Dispute Resolution workflow
  - [ ] 14.1 Implement dispute submission validation
    - Accept a dispute if and only if `Claim_Status` is `Approved` or `Denied` and the reason is non-empty and within `maxDisputeReasonLength`; otherwise reject with the specific violated requirement
    - _Requirements: 11.1, 11.4, 11.5_

  - [ ]* 14.2 Write property test for dispute submission validation
    - **Property 39: Dispute submission validation**
    - **Validates: Requirements 11.1, 11.4, 11.5**

  - [ ] 14.3 Implement `DisputeResolutionWorkflow` state machine definition
    - Define `ValidateDispute` → `RouteToAdjuster` → `AwaitAdjusterResolution` → `Resolved`/`Rejected` states, started on dispute submission
    - _Requirements: 11.1_

  - [ ] 14.4 Implement dispute review visibility data assembly
    - Assemble the original `Automated_Decision` record and the customer's dispute reason for the reviewing Human_Adjuster
    - _Requirements: 11.2_

  - [ ]* 14.5 Write property test for dispute review visibility round-trip
    - **Property 40: Dispute review visibility round-trip**
    - **Validates: Requirements 11.2**

  - [ ] 14.6 Implement dispute resolution recording handler
    - Accept the resolution and set `Claim_Status` to `Resolved`, recording the revised decision and adjuster identity, only when the revised decision is `Approved` or `Denied`
    - _Requirements: 11.3_

  - [ ]* 14.7 Write property test for dispute resolution decision constraint
    - **Property 41: Dispute resolution decision constraint and recording**
    - **Validates: Requirements 11.3**

  - [ ] 14.8 Wire dispute resolution audit event recording
    - Record the original decision, revised decision, and adjuster identity via the Audit Log Service when a Disputed Claim is Resolved
    - _Requirements: 11.6_

  - [ ]* 14.9 Write property test for dispute resolution audit completeness
    - **Property 42: Dispute resolution audit completeness**
    - **Validates: Requirements 11.6**

- [ ] 15. Implement Customer Portal authentication and session management
  - [x] 15.1 Implement Cognito authentication integration with generic error handling
    - Surface an identical, non-leaking invalid-credential error message regardless of whether the username or password was incorrect
    - _Requirements: 9.1, 9.2_

  - [ ]* 15.2 Write property test for authentication failure message uniformity
    - **Property 34: Authentication failure message uniformity**
    - **Validates: Requirements 9.2**

  - [ ] 15.3 Implement PreAuthentication Lambda trigger for lockout tracking
    - Track consecutive failed attempts per account in a TTL-based DynamoDB table and deny attempts once 5 consecutive failures occur within 15 minutes, until the lockout expires
    - _Requirements: 9.3_

  - [ ]* 15.4 Write property test for consecutive-failure account lockout
    - **Property 35: Consecutive-failure account lockout**
    - **Validates: Requirements 9.3**

  - [ ] 15.5 Implement session idle-timeout enforcement
    - Enforce a configurable timeout (default 15 minutes, range 5-30) that terminates the session and requires re-authentication once idle duration is reached
    - _Requirements: 9.6_

  - [ ]* 15.6 Write property test for session idle timeout enforcement
    - **Property 37: Session idle timeout enforcement**
    - **Validates: Requirements 9.6**

- [ ] 16. Implement Customer Portal claim access, document upload, and PII authorization
  - [ ] 16.1 Implement claim-ownership authorization predicate
    - Permit an operation (view status, view history, upload document) if and only if the authenticated customer's id is present in the Claim's `policyholderIds`, denying with a generic "claim not accessible" message otherwise
    - _Requirements: 9.4, 9.5, 10.5, 10.6_

  - [ ]* 16.2 Write property test for claim access authorization
    - **Property 36: Claim access authorization**
    - **Validates: Requirements 9.4, 9.5, 10.5, 10.6**

  - [ ] 16.5 Implement `POST /claims/{id}/documents` endpoint
    - Reuse the shared upload validator (5.1) and the claim-ownership predicate (16.1); return an explicit success confirmation on completion
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ] 16.3 Implement `GET /claims/{id}` status/history endpoint
    - Return the Claim's current `claimStatus` together with its complete `statusHistory`
    - _Requirements: 10.1_

  - [ ]* 16.4 Write property test for claim status view data pass-through
    - **Property 38: Claim status view data pass-through**
    - **Validates: Requirements 10.1**

  - [ ] 16.6 Implement PII access authorization predicate with denial audit
    - Grant access to stored PII if and only if the requester is an authorized system component or holds an authorized human role (Human_Adjuster, Fraud_Analyst, compliance officer); record every denial as an `AccessDenied` record via the Audit Log Service
    - _Requirements: 12.3, 12.4_

  - [ ]* 16.7 Write property test for PII access authorization and denial audit
    - **Property 43: PII access authorization and denial audit**
    - **Validates: Requirements 12.3, 12.4**

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (test-focused) and can be skipped for a faster MVP; core implementation tasks are never marked optional.
- Every property test references its exact design document property number and title, and must be tagged `// Feature: claims-management-fnol, Property N: <title>` per the design's Testing Strategy.
- Infrastructure/wiring concerns called out in the design (Transcribe/Rekognition/watchlist API wiring, KMS/TLS configuration, Cognito authorizer presence, audit-table IAM immutability) are validated by integration/smoke tests, not property tests, and are not broken out as separate tasks here since they are not coding-agent-executable end-to-end (they require a deployed environment).
- All Rekognition and watchlist-screening property tests (9.4, 10.2, 10.4, 10.7) inject a mocked client at the component boundary so they exercise only the aggregation/decision logic, per the design's mocking-boundary guidance.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1", "3.1", "3.3", "3.4", "5.1"] },
    { "id": 3, "tasks": ["2.2", "2.4", "3.2", "3.5", "5.2"] },
    { "id": 4, "tasks": ["2.3", "2.5", "2.6", "2.9"] },
    { "id": 5, "tasks": ["2.7", "2.8"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["6.2", "6.5", "6.7"] },
    { "id": 8, "tasks": ["6.3", "6.4", "6.6", "6.8", "6.9", "6.10"] },
    { "id": 9, "tasks": ["6.11", "6.12"] },
    { "id": 10, "tasks": ["7.1"] },
    { "id": 11, "tasks": ["7.2", "7.3", "7.5", "7.8"] },
    { "id": 12, "tasks": ["7.4", "7.6", "7.7", "7.9", "7.10"] },
    { "id": 13, "tasks": ["7.11"] },
    { "id": 14, "tasks": ["9.1", "10.1", "10.3", "10.5"] },
    { "id": 15, "tasks": ["9.2", "9.3", "10.2", "10.4", "10.6"] },
    { "id": 16, "tasks": ["9.4", "9.5", "10.7", "10.8"] },
    { "id": 17, "tasks": ["9.6", "9.7", "10.9", "10.10"] },
    { "id": 18, "tasks": ["12.1"] },
    { "id": 19, "tasks": ["12.3", "12.5", "12.7", "12.9", "12.11", "12.13", "12.15"] },
    { "id": 20, "tasks": ["12.4", "12.6", "12.8", "12.10", "12.12", "12.14"] },
    { "id": 21, "tasks": ["14.1", "15.1", "15.3", "15.5", "16.1"] },
    { "id": 22, "tasks": ["14.2", "14.3", "14.4", "15.2", "15.4", "15.6", "16.2", "16.5"] },
    { "id": 23, "tasks": ["14.5", "14.6", "16.3", "16.6"] },
    { "id": 24, "tasks": ["14.7", "14.8", "16.4", "16.7"] },
    { "id": 25, "tasks": ["14.9"] }
  ]
}
```
