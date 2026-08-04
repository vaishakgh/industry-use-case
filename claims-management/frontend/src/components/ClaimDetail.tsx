import { useState, useEffect } from 'react';
import { DocumentUpload } from './DocumentUpload';
import { DisputeForm } from './DisputeForm';

const API_URL = import.meta.env.VITE_API_URL || '/api/';

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
}

interface ClaimData {
  claimId: string;
  claimStatus: string;
  currentStatus?: string;
  policyNumber?: string;
  severityRating?: string;
  estimatedRepairCost?: number;
  approvedAmount?: number;
  fraudFlag?: boolean;
  statusHistory: StatusHistoryEntry[];
}

interface ClaimDetailProps {
  claimId: string;
  onBack: () => void;
  onSessionTimeout: () => void;
  token: string;
}

const DISPUTABLE_STATUSES = ['Approved', 'Denied'];

export function ClaimDetail({ claimId, onBack, onSessionTimeout, token }: ClaimDetailProps) {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaim();
  }, [claimId]);

  const fetchClaim = async () => {
    try {
      const response = await fetch(`${API_URL}claims/${claimId}`, {
        headers: { Authorization: token },
      });
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

  const status = claim.claimStatus || claim.currentStatus || 'Unknown';
  const canDispute = DISPUTABLE_STATUSES.includes(status);

  return (
    <div className="claim-detail" aria-label="Claim Detail">
      <button onClick={onBack}>← Back to Claims</button>
      <h2>Claim {claim.claimId}</h2>
      <table>
        <tbody>
          <tr><td><strong>Status</strong></td><td>{status}</td></tr>
          {claim.policyNumber && <tr><td><strong>Policy</strong></td><td>{claim.policyNumber}</td></tr>}
          {claim.severityRating && <tr><td><strong>Severity</strong></td><td>{claim.severityRating}</td></tr>}
          {claim.estimatedRepairCost !== undefined && <tr><td><strong>Estimated Cost</strong></td><td>${claim.estimatedRepairCost}</td></tr>}
          {claim.approvedAmount !== undefined && <tr><td><strong>Approved Amount</strong></td><td>${claim.approvedAmount}</td></tr>}
          {claim.fraudFlag !== undefined && <tr><td><strong>Fraud Flag</strong></td><td>{claim.fraudFlag ? '🚨 Yes' : '✅ No'}</td></tr>}
        </tbody>
      </table>

      <h3>Status History</h3>
      <ol role="list" aria-label="Status timeline">
        {(claim.statusHistory || []).map((entry, index) => (
          <li key={index}>
            <strong>{entry.status}</strong> — {new Date(entry.timestamp).toLocaleString()}
          </li>
        ))}
      </ol>

      <DocumentUpload claimId={claimId} onSessionTimeout={onSessionTimeout} token={token} />

      {canDispute && (
        <DisputeForm claimId={claimId} onSessionTimeout={onSessionTimeout} token={token} />
      )}
    </div>
  );
}
