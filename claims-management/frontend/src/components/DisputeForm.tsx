import { useState, type FormEvent } from 'react';

/** Maximum dispute reason length (mirrors backend config). */
const MAX_DISPUTE_REASON_LENGTH = 2000;

interface DisputeFormProps {
  claimId: string;
  onSessionTimeout: () => void;
}

/**
 * Dispute Submission form.
 *
 * Rendered only when the claim's status is Approved or Denied. Includes
 * a reason field with client-side max-length validation.
 *
 * _Requirements: 11.1, 11.4, 11.5_
 */
export function DisputeForm({ claimId, onSessionTimeout }: DisputeFormProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    setValidationError(null);

    const trimmed = reason.trim();

    // Client-side validation: non-empty
    if (trimmed.length === 0) {
      setValidationError('Dispute reason must not be empty.');
      return;
    }

    // Client-side validation: max length
    if (trimmed.length > MAX_DISPUTE_REASON_LENGTH) {
      setValidationError(
        `Dispute reason exceeds the maximum allowed length of ${MAX_DISPUTE_REASON_LENGTH} characters.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/claims/${claimId}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: trimmed }),
      });

      if (response.status === 401) {
        onSessionTimeout();
        return;
      }

      const data = await response.json();
      setResult({
        success: response.ok,
        message: data.message ?? (response.ok ? 'Dispute submitted successfully.' : 'Submission failed.'),
      });
      if (response.ok) setReason('');
    } catch {
      setResult({ success: false, message: 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dispute-form" aria-label="Dispute Submission">
      <h3>Submit a Dispute</h3>
      <form onSubmit={handleSubmit}>
        <label htmlFor="dispute-reason">
          Reason for dispute ({reason.trim().length}/{MAX_DISPUTE_REASON_LENGTH})
        </label>
        <textarea
          id="dispute-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_DISPUTE_REASON_LENGTH + 1}
          rows={4}
          required
          aria-describedby="dispute-reason-help"
        />
        <small id="dispute-reason-help">
          Explain why you disagree with the claim decision.
        </small>
        {validationError && (
          <p className="validation-error" role="alert">
            {validationError}
          </p>
        )}
        {result && (
          <p className={result.success ? 'dispute-success' : 'dispute-failure'} role="status">
            {result.message}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </form>
    </div>
  );
}
