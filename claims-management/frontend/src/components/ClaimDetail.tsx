import { useState, useEffect } from 'react';
import { DocumentUpload } from './DocumentUpload';
import { DisputeForm } from './DisputeForm';

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
}

interface ClaimData {
  claimId: string;
  currentStatus: string;
  statusHistory: StatusHistoryEntry[];
}

interface ClaimDetailProps {
  claimId: string;
  onBack: () => void;
  onSessionTimeout: () => void;
}

/** Statuses that permit dispute submission. */
const DISPUTABLE_STATUSES = ['Approved', 'Denied'];

/**
 * Claim Detail/Status view.
 *
 * Fetches a claim via GET /claims/{id} and renders its current status
 * together with the full statusHistory as a timeline.
 *
 * _Requirements: 10.1_
 */
export function ClaimDetail({ claimId, onBack, onSessionTimeout }: ClaimDetailProps) {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaim();
  }, [claimId]);

  const fetchClaim = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}`);
      if (response.status === 401) {
        onSessionTimeout();
        return;
      }
      if (!response.ok) {
        setError('Failed to load claim details.');
        return;
      }
      const data = await response.json();
      setClaim(data);
    } catch {
      setError('Failed to load claim details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading claim details...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!claim) return <p>Claim not found.</p>;

  const canDispute = DISPUTABLE_STATUSES.includes(claim.currentStatus);

  return (
    <div className="claim-detail" aria-label="Claim Detail">
      <button onClick={onBack}>Back to Claims</button>
      <h2>Claim {claim.claimId}</h2>
      <p>
        <strong>Current Status:</strong> {claim.currentStatus}
      </p>

      <h3>Status History</h3>
      <ol role="list" aria-label="Status timeline">
        {claim.statusHistory.map((entry, index) => (
          <li key={index}>
            {entry.status} — {new Date(entry.timestamp).toLocaleString()}
          </li>
        ))}
      </ol>

      <DocumentUpload claimId={claimId} onSessionTimeout={onSessionTimeout} />

      {canDispute && (
        <DisputeForm claimId={claimId} onSessionTimeout={onSessionTimeout} />
      )}
    </div>
  );
}
