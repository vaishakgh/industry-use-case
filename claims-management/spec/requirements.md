# Requirements Document

## Introduction

The Claims Management and First Notice of Loss (FNOL) system enables insurance customers to report claims through voice, email, or chat, and automates the intake, assessment, fraud screening, and payout lifecycle of those claims. An AI intake agent extracts structured claim data from unstructured customer communications and preserves conversation context across channels. Uploaded damage photos are analyzed automatically to estimate severity and repair cost, enabling straight-through processing for low-risk claims while routing complex or high-value claims to human adjusters. A continuous fraud detection capability screens claims for suspicious patterns and holds automated payouts pending analyst review when indicators are present. Claims progress through a defined lifecycle orchestrated as a state machine with retry and escalation handling, and every automated decision is logged with its inputs and confidence score to satisfy regulatory audit requirements. Customers can track claim status, upload additional documents, and contest decisions through a secure self-service portal.

## Glossary

- **Claims_Management_System**: The overall system encompassing intake, assessment, fraud screening, orchestration, payout, dispute handling, and the customer portal.
- **FNOL_Intake_Agent**: The AI agent (built on Bedrock AgentCore) that receives customer claim reports across voice, email, and chat channels and extracts structured claim data.
- **Claim**: A record representing a customer's reported loss, identified by a unique Claim_ID, containing policy number, incident date, incident location, damage description, status, and associated evidence.
- **Claim_Session**: The persisted conversation context and extracted field state associated with a single Claim across one or more channel interactions.
- **Structured_Claim_Fields**: The set of extracted data fields for a Claim: policy number, incident date, incident location, and damage description.
- **Voice_Channel**: The telephone/voice intake channel, where audio is converted to text by Amazon Transcribe before being passed to the FNOL_Intake_Agent.
- **Email_Channel**: The email intake channel through which customers submit claim reports as email messages.
- **Chat_Channel**: The web or messaging-based text intake channel.
- **Damage_Assessment_Service**: The service (using Amazon Rekognition) that analyzes uploaded damage photos to produce a severity rating and estimated repair cost.
- **Severity_Rating**: A classification of damage severity produced by the Damage_Assessment_Service, expressed as Low, Medium, or High.
- **Auto_Approval_Threshold**: The configured combination of maximum Severity_Rating and maximum estimated repair cost below which a Claim is eligible for automatic approval.
- **Fraud_Detection_Service**: The service that continuously evaluates Claims for fraud indicators, including claim frequency, timeline consistency, and sanctions/watchlist screening.
- **Fraud_Indicator**: A specific signal (e.g., excessive claim frequency, inconsistent timeline, watchlist match) identified by the Fraud_Detection_Service.
- **Fraud_Flag**: A status applied to a Claim when one or more Fraud_Indicators are detected, which suspends automated payout.
- **Fraud_Analyst**: A human user role responsible for reviewing Fraud_Flagged Claims.
- **Human_Adjuster**: A human user role responsible for reviewing Claims that are not eligible for automatic approval, or that are disputed.
- **Claims_Orchestrator**: The AWS Step Functions state machine that manages Claim progression through the intake, assessment, fraud check, and payout or dispute lifecycle stages.
- **Transient_Failure**: An error condition in a lifecycle stage that is expected to succeed on retry (e.g., a timeout or throttling error from a dependent service).
- **Persistent_Failure**: An error condition in a lifecycle stage that continues to fail after the configured retry attempts are exhausted.
- **Audit_Log_Service**: The service responsible for recording every automated decision, its inputs, and its confidence score.
- **Automated_Decision**: A system-generated determination on a Claim, including approval, denial, or fraud flag, produced without direct human action.
- **Confidence_Score**: A numeric value between 0 and 1 indicating the certainty of an Automated_Decision or extracted field.
- **Customer_Portal**: The self-service web application (built with Amplify) through which customers check Claim status and upload documents. The Customer_Portal comprises two parts: a browser-based frontend (an Amplify-hosted single-page application) that customers interact with directly, and backend APIs (authentication via Cognito, claim access, document upload, and dispute submission) that the frontend calls.
- **Customer**: An authenticated policyholder interacting with the Customer_Portal or an intake channel.
- **Dispute**: A customer-initiated contest of a Claim decision, routed to a Human_Adjuster queue for resolution.
- **Claim_Status**: The current lifecycle stage of a Claim, one of: Intake, Assessment, Fraud_Check, Pending_Adjuster_Review, Approved, Denied, Paid, Disputed, Resolved.
- **Personally_Identifiable_Information**: Data associated with a Claim or Customer that can be used to identify a specific individual, including but not limited to policyholder name, contact details, policy number, incident location, and uploaded documents or photos.

## Requirements

### Requirement 1: Omnichannel Claim Intake

**User Story:** As a customer, I want to report a claim through voice, email, or chat, so that I can use whichever channel is most convenient for me.

#### Acceptance Criteria

1. WHEN a customer initiates a claim report through the Voice_Channel, THE FNOL_Intake_Agent SHALL convert the audio to text using Amazon Transcribe before processing the claim report.
2. WHEN a customer initiates a claim report through the Email_Channel, THE FNOL_Intake_Agent SHALL parse the email content and process it as a claim report.
3. WHEN a customer initiates a claim report through the Chat_Channel, THE FNOL_Intake_Agent SHALL process the chat message content as a claim report.
4. WHEN the FNOL_Intake_Agent receives a claim report from any channel, THE FNOL_Intake_Agent SHALL create a Claim with a unique Claim_ID if no existing Claim_Session applies.
5. IF the Voice_Channel transcription confidence for a segment falls below a configured threshold, THEN THE FNOL_Intake_Agent SHALL prompt the customer to confirm or restate the affected information.
6. IF the Voice_Channel audio cannot be transcribed after a configured number of retry attempts, THEN THE FNOL_Intake_Agent SHALL inform the customer and offer to continue the claim report through the Chat_Channel or Email_Channel.
7. IF the FNOL_Intake_Agent cannot parse any claim-relevant content from an Email_Channel or Chat_Channel message, THEN THE FNOL_Intake_Agent SHALL ask the customer to resubmit or clarify the claim report.
8. IF a customer fails to confirm or restate requested information after a configured number of attempts, THEN THE FNOL_Intake_Agent SHALL route the Claim to a Human_Adjuster for manual intake completion.

### Requirement 2: Structured Field Extraction

**User Story:** As a claims operations manager, I want the intake agent to extract structured data from customer claim reports, so that claims can be processed consistently regardless of intake channel.

#### Acceptance Criteria

1. WHEN the FNOL_Intake_Agent processes a claim report, THE FNOL_Intake_Agent SHALL extract all four required Structured_Claim_Fields values from the customer's input: policy number, incident date, incident location, and damage description.
2. WHEN the FNOL_Intake_Agent extracts a Structured_Claim_Fields value, THE FNOL_Intake_Agent SHALL record a Confidence_Score for the extracted value.
3. IF a required Structured_Claim_Fields value cannot be extracted from the customer's input, THEN THE FNOL_Intake_Agent SHALL ask the customer a clarifying question to obtain the missing value, up to a maximum of 3 attempts per field.
4. IF an extracted Structured_Claim_Fields value has a Confidence_Score below a configured threshold, THEN THE FNOL_Intake_Agent SHALL confirm the value with the customer before storing it.
5. WHEN each required Structured_Claim_Fields value either has a Confidence_Score at or above the configured threshold or has been explicitly confirmed by the customer, THE FNOL_Intake_Agent SHALL update the Claim status to Assessment and store the values on the Claim.
6. IF a required Structured_Claim_Fields value remains unresolved after 3 clarifying-question attempts, THEN THE FNOL_Intake_Agent SHALL route the Claim to a Human_Adjuster for manual completion of the missing field.
7. IF a customer rejects a Structured_Claim_Fields value presented for confirmation, THEN THE FNOL_Intake_Agent SHALL re-request the value from the customer and re-evaluate the Confidence_Score of the newly provided value.

### Requirement 3: Cross-Channel Conversation Continuity

**User Story:** As a customer, I want to resume my claim on a different channel without repeating information, so that reporting my claim is not disrupted by switching devices or contact methods.

#### Acceptance Criteria

1. WHEN a customer provides a Claim_ID or policy number on a different channel than where an existing Claim_Session was started, AND the referenced Claim's Claim_Status is Intake, THE FNOL_Intake_Agent SHALL retrieve the existing Claim_Session and continue from the previously captured Structured_Claim_Fields.
2. THE FNOL_Intake_Agent SHALL persist Claim_Session context across Voice_Channel, Email_Channel, and Chat_Channel interactions while the Claim's Claim_Status is Intake.
3. WHEN a customer resumes a Claim_Session, THE FNOL_Intake_Agent SHALL NOT re-request Structured_Claim_Fields values already confirmed in the prior interaction.
4. IF a customer references a Claim_ID that does not match an existing Claim_Session, THEN THE FNOL_Intake_Agent SHALL inform the customer that the claim could not be located and offer to start a new claim report.
5. IF a customer's provided policy number matches more than one Claim_Session with Claim_Status of Intake, THEN THE FNOL_Intake_Agent SHALL ask the customer for the specific Claim_ID to disambiguate before resuming.

### Requirement 4: Damage Photo Upload and Analysis

**User Story:** As a customer, I want to upload damage photos, so that my claim can be assessed without waiting for an in-person inspection.

#### Acceptance Criteria

1. WHEN a customer uploads one or more damage photos for a Claim, THE Claims_Management_System SHALL store each photo in S3 and associate it with the Claim, up to a configured maximum number of photos per Claim.
2. WHEN one or more damage photos are stored for a Claim, THE Damage_Assessment_Service SHALL analyze all damage photos currently associated with the Claim using Amazon Rekognition to produce a single Severity_Rating and an estimated repair cost for the Claim.
3. WHEN the Damage_Assessment_Service produces a Severity_Rating and estimated repair cost for a Claim, THE Damage_Assessment_Service SHALL record a Confidence_Score with the assessment and store the Severity_Rating, estimated repair cost, and Confidence_Score on the Claim.
4. IF an uploaded file is not among the Claims_Management_System's supported image formats, THEN THE Claims_Management_System SHALL reject the upload without storing the file and inform the customer of the supported image formats.
5. IF an uploaded photo exceeds a configured maximum file size, THEN THE Claims_Management_System SHALL reject the upload without storing the file and inform the customer of the maximum allowed file size.
6. IF the Damage_Assessment_Service determines that photo quality or ambiguity is preventing it from producing a reliable Severity_Rating for a Claim, THEN THE Claims_Management_System SHALL request the customer to resubmit clearer damage photos, up to a configured maximum number of resubmission attempts, before routing the Claim to a Human_Adjuster.
7. IF the Damage_Assessment_Service is unable to produce a Severity_Rating for a Claim after the configured maximum number of resubmission attempts is exhausted, or analysis fails for a reason other than photo quality or ambiguity, or the resulting Confidence_Score falls below a configured threshold, THEN THE Claims_Management_System SHALL route the Claim to a Human_Adjuster for manual assessment and set the Claim_Status to Pending_Adjuster_Review.

### Requirement 5: Automated Approval and Adjuster Routing

**User Story:** As a claims operations manager, I want straightforward low-severity, low-value claims to be automatically approved, so that adjusters can focus on complex claims.

#### Acceptance Criteria

1. WHEN a Claim completes the Fraud_Check lifecycle stage without a Fraud_Flag, AND the Claim's Severity_Rating and estimated repair cost are both at or below the Auto_Approval_Threshold, THE Claims_Management_System SHALL set the Claim_Status to Approved.
2. WHEN a Claim completes the Fraud_Check lifecycle stage without a Fraud_Flag, AND the Claim's Severity_Rating or estimated repair cost is above the Auto_Approval_Threshold, THE Claims_Management_System SHALL set the Claim_Status to Pending_Adjuster_Review and route the Claim to a Human_Adjuster queue for review.
3. IF a Claim carries a Fraud_Flag, THEN THE Claims_Management_System SHALL exclude the Claim from automatic approval regardless of Severity_Rating or estimated repair cost.
4. WHEN a Human_Adjuster approves a routed Claim, THE Claims_Management_System SHALL set the Claim_Status to Approved and record the adjuster's identity on the Claim.
5. WHEN a Human_Adjuster denies a routed Claim, THE Claims_Management_System SHALL set the Claim_Status to Denied and record the adjuster's identity on the Claim.

### Requirement 6: Continuous Fraud Screening

**User Story:** As a fraud analyst, I want claims continuously screened for fraud indicators, so that suspicious claims are identified before payout.

#### Acceptance Criteria

1. WHEN a Claim reaches the Fraud_Check lifecycle stage, THE Fraud_Detection_Service SHALL evaluate the claim frequency associated with the policy or customer against a configured claim frequency threshold measured over a configured time window, and identify a claim frequency Fraud_Indicator if the threshold is exceeded.
2. WHEN a Claim reaches the Fraud_Check lifecycle stage, THE Fraud_Detection_Service SHALL evaluate the reported incident timeline for discrepancies among the reported incident date, incident location, and event sequence, and identify a timeline Fraud_Indicator if one or more discrepancies are found.
3. WHEN a Claim reaches the Fraud_Check lifecycle stage, THE Fraud_Detection_Service SHALL screen the associated customer against sanctions and watchlist data sources.
4. IF the Fraud_Detection_Service identifies one or more Fraud_Indicators for a Claim, THEN THE Fraud_Detection_Service SHALL apply a Fraud_Flag to the Claim and record the identified Fraud_Indicators with their Confidence_Scores.
5. WHILE a Claim carries a Fraud_Flag, THE Claims_Management_System SHALL suspend any automated payout for the Claim until a Fraud_Analyst records a review decision.
6. WHEN a Fraud_Analyst records a review decision on a Fraud_Flagged Claim, THE Claims_Management_System SHALL record the Fraud_Analyst's identity and decision on the Claim, and SHALL either clear the Fraud_Flag and resume processing at the Fraud_Check stage or set the Claim_Status to Denied, according to the analyst's decision.

### Requirement 7: Claim Lifecycle Orchestration

**User Story:** As a claims operations manager, I want claims to move through a defined lifecycle with reliable error handling, so that transient issues do not stall claims and persistent issues get human attention.

#### Acceptance Criteria

1. THE Claims_Orchestrator SHALL manage each Claim through the Intake, Assessment, and Fraud_Check lifecycle stages in that order, followed by either the Payout stage or, upon a customer-initiated Dispute per Requirement 11, the Disputed stage, except where a stage routes the Claim to a Human_Adjuster or Fraud_Analyst.
2. IF a lifecycle stage encounters a Transient_Failure, THEN THE Claims_Orchestrator SHALL retry the stage according to a configured retry policy with a maximum of 3 attempts and a configured backoff interval between attempts.
3. IF a lifecycle stage retry attempt results in a Persistent_Failure, THEN THE Claims_Orchestrator SHALL set the Claim_Status to Pending_Adjuster_Review and escalate the Claim to the Human_Adjuster queue for manual review.
4. WHEN a Claim completes the Fraud_Check stage without a Fraud_Flag and meets the Auto_Approval_Threshold, THE Claims_Orchestrator SHALL transition the Claim to the Payout stage.
5. WHEN a Claim is approved by a Human_Adjuster, THE Claims_Orchestrator SHALL transition the Claim to the Payout stage.
6. THE Claims_Orchestrator SHALL record each Claim_Status transition with a timestamp on the Claim.
7. WHEN the Payout stage completes successfully for a Claim, THE Claims_Orchestrator SHALL set the Claim_Status to Paid.
8. WHEN a Claim reaches a terminal Claim_Status of Approved, Denied, Paid, or Resolved, THE Claims_Management_System SHALL notify the customer of the Claim_Status change through the channel on which the Claim was originally reported.

### Requirement 8: Automated Decision Audit Logging

**User Story:** As a compliance officer, I want every automated decision logged with its inputs and confidence score, so that I can support regulatory audits of the claims process.

#### Acceptance Criteria

1. WHEN the Claims_Management_System produces an Automated_Decision, THE Audit_Log_Service SHALL record the decision type, the input data used, the Confidence_Score, the Claim_ID, and a timestamp.
2. THE Audit_Log_Service SHALL retain each Automated_Decision record without allowing modification or deletion for a configured retention period.
3. WHEN a Fraud_Flag is applied to a Claim, THE Audit_Log_Service SHALL record the Fraud_Indicators and their Confidence_Scores as part of the Automated_Decision record.
4. WHEN a compliance officer requests the audit history for a specific Claim, THE Audit_Log_Service SHALL return all Automated_Decision records associated with that Claim_ID in chronological order from earliest to latest, or an empty result if no records exist for that Claim_ID.
5. IF an entity without compliance-officer authorization requests audit history for a Claim, THEN THE Audit_Log_Service SHALL deny the request.
6. IF the Audit_Log_Service fails to record an Automated_Decision, THEN THE Claims_Management_System SHALL prevent that Automated_Decision from taking effect until the record is successfully written.

### Requirement 9: Customer Self-Service Portal Authentication

**User Story:** As a customer, I want to securely log in to a self-service portal, so that only I can access my claim information.

#### Acceptance Criteria

1. THE Customer_Portal SHALL require a customer to authenticate through Amazon Cognito before accessing any Claim data.
2. IF a customer submits invalid authentication credentials, THEN THE Customer_Portal SHALL deny access and display an authentication error message indicating the credentials are invalid, without indicating whether the username or password was the incorrect element.
3. IF a customer submits invalid authentication credentials 5 times consecutively within a 15-minute period, THEN THE Customer_Portal SHALL lock the customer's account for 15 minutes and deny all further login attempts for that account during the lockout period.
4. WHEN a customer successfully authenticates, THE Customer_Portal SHALL restrict visible Claims to only those Claims for which the authenticated customer is the policyholder or a designated claimant on record.
5. IF an authenticated customer attempts to access a Claim that is not associated with their account, THEN THE Customer_Portal SHALL deny access and display an error message indicating the Claim is not accessible.
6. IF a customer's session is inactive for a configurable timeout period, defaulting to 15 minutes with an allowed range of 5 to 30 minutes, THEN THE Customer_Portal SHALL terminate the session and require re-authentication before granting further access to Claim data.

### Requirement 10: Self-Service Claim Status and Document Upload

**User Story:** As a customer, I want to check my claim status and upload additional documents through the portal, so that I can track progress and provide requested information without contacting support.

#### Acceptance Criteria

1. WHEN an authenticated customer views a Claim, THE Customer_Portal SHALL display the current Claim_Status and the history of Claim_Status transitions with their timestamps as recorded per Requirement 7.6.
2. WHEN an authenticated customer uploads a document for one of their Claims, THE Customer_Portal SHALL store the document in S3 and associate it with the Claim, subject to a configured maximum file size and a configured set of supported document formats.
3. IF an authenticated customer uploads a document that exceeds the configured maximum file size or is not among the configured supported formats, THEN THE Customer_Portal SHALL reject the upload without storing the file and inform the customer of the applicable limit or supported formats.
4. WHEN a document upload completes successfully, THE Customer_Portal SHALL confirm the successful upload to the customer.
5. IF an authenticated customer attempts to view a Claim not associated with their account, THEN THE Customer_Portal SHALL deny the request and display an error message indicating the Claim is not accessible.
6. IF an authenticated customer attempts to upload a document for a Claim not associated with their account, THEN THE Customer_Portal SHALL deny the request and display an error message indicating the Claim is not accessible.

### Requirement 11: Dispute and Appeals Flow

**User Story:** As a customer, I want to contest a claim decision, so that I can have a human adjuster reconsider the outcome.

#### Acceptance Criteria

1. WHEN an authenticated customer submits a Dispute with a non-empty dispute reason not exceeding a configured maximum length for a Claim with a Claim_Status of Approved or Denied, THE Claims_Management_System SHALL set the Claim_Status to Disputed and route the Claim to a Human_Adjuster queue.
2. WHEN a Claim is routed for Dispute review, THE Claims_Management_System SHALL make the original Automated_Decision record and the customer's dispute reason available to the reviewing Human_Adjuster.
3. WHEN a Human_Adjuster records a resolution for a Disputed Claim, THE Claims_Management_System SHALL update the Claim_Status to Resolved and record the revised decision, constrained to either Approved or Denied, along with the adjuster's identity.
4. IF a customer submits a Dispute for a Claim that is not in Approved or Denied status, THEN THE Claims_Management_System SHALL reject the dispute submission and inform the customer of the eligible Claim_Status values.
5. IF a customer submits a Dispute with an empty dispute reason or a dispute reason exceeding the configured maximum length, THEN THE Claims_Management_System SHALL reject the dispute submission and inform the customer of the dispute reason requirements.
6. WHEN a Disputed Claim is Resolved, THE Audit_Log_Service SHALL record the resolution as an Automated_Decision-adjacent event, including the original decision, the revised decision, and the adjuster's identity.

### Requirement 12: Data Protection and Encryption

**User Story:** As a compliance officer, I want personally identifiable information protected throughout the system, so that the organization meets its regulatory obligations for data security in a financial services context.

#### Acceptance Criteria

1. WHERE Personally_Identifiable_Information is stored by the Claims_Management_System, THE Claims_Management_System SHALL encrypt the Personally_Identifiable_Information at rest.
2. WHERE Personally_Identifiable_Information is transmitted between the Claims_Management_System and a customer, channel, or component, THE Claims_Management_System SHALL encrypt the Personally_Identifiable_Information in transit.
3. THE Claims_Management_System SHALL restrict access to unencrypted Personally_Identifiable_Information to authorized system components and authenticated, authorized human roles, including Human_Adjuster, Fraud_Analyst, and compliance officer.
4. IF a component or actor without authorization attempts to access stored Personally_Identifiable_Information, THEN THE Claims_Management_System SHALL deny the access attempt and record the attempt in the Audit_Log_Service.
