import { useState, type FormEvent } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api/';

interface ReportClaimProps {
  onBack: () => void;
  onSuccess: () => void;
  token: string;
}

/**
 * Report New Claim form.
 *
 * Simulates the Chat channel intake: customer provides claim details,
 * which are sent to the Portal API → Intake Agent Lambda → DynamoDB + Step Functions.
 */
export function ReportClaim({ onBack, onSuccess, token }: ReportClaimProps) {
  const [policyNumber, setPolicyNumber] = useState('POL-PORTAL-001');
  const [incidentDate, setIncidentDate] = useState('2026-08-01');
  const [incidentLocation, setIncidentLocation] = useState('Main Street Parking Lot, Frankfurt');
  const [damageDescription, setDamageDescription] = useState('My car was hit while parked. Rear bumper is dented and paint is scratched. No witnesses available.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!policyNumber.trim() || !incidentDate || !damageDescription.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}claims/report`, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'Chat',
          policyNumber: policyNumber.trim(),
          incidentDate: new Date(incidentDate).toISOString(),
          incidentLocation: incidentLocation.trim(),
          damageDescription: damageDescription.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setError(data.message || 'Failed to submit claim.');
      }
    } catch {
      setError('Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-claim" aria-label="Report New Claim">
      <button onClick={onBack} className="back-btn">← Back to Claims</button>
      <h2>Report a New Claim</h2>
      <p className="report-subtitle">Submit your First Notice of Loss (FNOL) via the Chat channel</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="policyNumber">Policy Number *</label>
          <input
            id="policyNumber"
            type="text"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            placeholder="e.g., POL-12345"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="incidentDate">Incident Date *</label>
          <input
            id="incidentDate"
            type="date"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="incidentLocation">Incident Location</label>
          <input
            id="incidentLocation"
            type="text"
            value={incidentLocation}
            onChange={(e) => setIncidentLocation(e.target.value)}
            placeholder="e.g., Main Street intersection"
          />
        </div>

        <div className="form-group">
          <label htmlFor="damageDescription">Damage Description *</label>
          <textarea
            id="damageDescription"
            value={damageDescription}
            onChange={(e) => setDamageDescription(e.target.value)}
            placeholder="Describe the damage to your vehicle or property..."
            rows={4}
            required
          />
        </div>

        {error && <div className="error-message" role="alert">{error}</div>}

        <button type="submit" disabled={submitting} className="submit-btn">
          {submitting ? 'Submitting Claim...' : 'Submit Claim'}
        </button>
      </form>
    </div>
  );
}
