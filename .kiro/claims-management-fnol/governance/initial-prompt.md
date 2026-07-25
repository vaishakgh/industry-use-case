# Initial Prompt

Build a Claims Management and FNOL (First Notice of Loss) system for an insurance claims use case.

The system should let customers report a claim through voice, email, or chat, with an AI agent handling omnichannel intake — extracting policy number, incident date, location, and damage description into structured fields, and maintaining conversation context if the customer resumes their claim on a different channel later.

Customers should be able to upload damage photos, which get automatically analyzed to estimate severity and repair cost, with straightforward low-severity, low-value claims eligible for automatic approval and everything else routed to a human adjuster.

The system should continuously monitor claims for fraud indicators — unusual claim frequency, inconsistent timelines, and sanctions/watchlist screening — flagging suspicious claims and suspending automated payout until a fraud analyst reviews them.

Claims should move through a defined lifecycle — intake, assessment, fraud check, and payout or dispute — orchestrated as a state machine with retry handling on transient failures and escalation to manual review on persistent ones. Every automated decision (approval, denial, fraud flag) needs to be logged with its inputs and confidence score for audit purposes, since this is a regulated financial services context.

Customers should also have a self-service portal to check claim status and upload additional documents, with secure authentication.

As an advanced capability, support a dispute/appeals flow where a customer can contest a decision, which routes to a human adjuster queue and updates the claim on resolution.

Target AWS services: Bedrock AgentCore (agent runtime and memory), Amazon Transcribe (voice-to-text), Amazon Rekognition (damage assessment), AWS Step Functions (orchestration), Lambda (fraud and payout logic), DynamoDB (claims data), S3 (documents), Amplify and Cognito (customer portal and auth).
