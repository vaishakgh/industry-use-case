# Claims Management & FNOL System

A Claims Management and First Notice of Loss (FNOL) system for a property/casualty insurance use case, built on AWS serverless services. The system automates claim intake, damage assessment, fraud screening, and claim lifecycle orchestration, while keeping every automated decision auditable for regulatory compliance.

## Project Summary

The system is built around five cooperating subsystems:

1. **FNOL Intake Agent** (Bedrock AgentCore + Amazon Transcribe) — omnichannel (voice/email/chat) claim intake. Converts voice to text via Transcribe, extracts structured claim fields (policy number, incident date, incident location, damage description) with confidence scoring, and maintains cross-channel session continuity so a customer can resume a claim on a different channel without repeating information.
2. **Damage Assessment Service** (Amazon Rekognition) — analyzes uploaded damage photos to automatically produce a severity rating, estimated repair cost, and confidence score, enabling straight-through processing for low-risk claims.
3. **Fraud Detection Service** — continuously evaluates claims for fraud indicators: claim frequency, timeline consistency, and sanctions/watchlist screening. Flags claims to suspend automated payout when indicators are present.
4. **Claims Orchestrator** (AWS Step Functions) — a state machine that drives each claim through its lifecycle (Intake → Assessment → Fraud_Check → Payout/Disputed), with retry/backoff for transient failures and escalation to human review queues for persistent failures or complex claims.
5. **Customer Portal** (Amplify + Cognito) — a self-service web application for status tracking, document upload, and dispute submission.

All claim state lives in **DynamoDB**, and all binary evidence (photos, documents) lives in **S3**. Every automated decision (approval, denial, fraud flag) is written to an append-only audit log **before** it is allowed to take effect — this fail-safe compliance guarantee is central to the system's regulatory audit requirements.

## Repository Structure

```
claims-management/
├── README.md
├── backend/
│   └── services/          # 7 npm-workspace TypeScript packages (Lambda-style backend services)
│       ├── audit-log/          # Append-only decision audit trail
│       ├── damage-assessment/  # Rekognition-based photo severity/cost analysis
│       ├── fraud-detection/    # Claim frequency, timeline, watchlist screening
│       ├── intake-agent/       # FNOL channel adapters, session continuity, field extraction
│       ├── orchestrator/       # Claims lifecycle state machine + Claims table access
│       ├── portal/             # Customer portal backend (Cognito auth, claim access APIs)
│       └── shared/             # Shared domain types, config loader, upload validator
├── frontend/               # Amplify customer portal web app (not yet implemented)
├── spec/
│   ├── requirements.md     # EARS-format requirements (12 requirement sections)
│   ├── design.md           # Architecture, data models, correctness properties
│   └── tasks.md            # Implementation task list with dependency graph
├── package.json, tsconfig*.json, jest.config.js, eslint.config.js
└── .kiro/                  # Kiro spec workflow metadata and governance docs
```

## Status

**~18% of implementation tasks complete (17 of 96 sub-tasks).**

Completed work:

- **Section 1 — Project foundations**: project scaffolding (1.1), shared domain types/enums (1.2), config loader (1.3) done. Config loader unit tests (1.4) still pending.
- **Section 2 — Audit Log Service**: DynamoDB access layer (2.1), `recordAutomatedDecision` handler (2.2), and the audit-write-precedes-effect wrapper (2.4) done. The GET query handler and several property tests (2.3, 2.5–2.9) still pending.
- **Section 3 — Claims/ClaimSession data layer**: fully complete — Claims table access layer, status history property test, ClaimSessions table access layer, claim ID generation, and unique-claim-creation property test (3.1–3.5).
- **Section 5 — Shared upload validation**: fully complete — upload validator and its property test (5.1–5.2).
- **Section 6 — Intake Agent channel/session**: ChannelMessage normalization (6.1) done. Remaining channel/session tasks and all associated property tests (6.2–6.12) still pending.
- **Section 10 — Fraud Detection**: claim frequency check (10.1) and mocked watchlist screening client (10.5) done. Timeline consistency, real watchlist integration, and related tasks (10.2–10.4, 10.6–10.10) still pending.
- **Section 15 — Portal auth**: Cognito authentication integration (15.1) done. Claim access APIs and related tasks (15.2–15.6) still pending.

Not started: Section 4 (checkpoint), Section 7 (field extraction/clarification), Section 8 (checkpoint), Section 9 (Damage Assessment Service), Section 11 (checkpoint), Section 12 (Claims Orchestrator lifecycle/approval), Section 13 (checkpoint), Section 14 (Dispute Resolution workflow), Section 16 (Portal claim access/PII authorization), Section 17 (final checkpoint).

The frontend (Amplify web app) has not been started — only the portal's backend API/auth logic exists so far.

Build, lint, and the full test suite (149 tests across 28 suites) are passing as of the last verified run.

## References

- [Requirements](spec/requirements.md)
- [Design](spec/design.md)
- [Implementation Tasks](spec/tasks.md)

## Getting Started

```bash
npm install       # install dependencies at the repo root
npm run build     # tsc -b across all backend packages
npm test          # jest, runs against backend/services
npm run lint      # eslint
```
