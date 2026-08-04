import { useState, useEffect } from 'react';
import { ClaimDetail } from './ClaimDetail';

const API_URL = import.meta.env.VITE_API_URL || '/api/';

interface Claim {
  claimId: string;
  currentStatus: string;
  policyNumber?: string;
  createdAt?: string;
}

interface ClaimsDashboardProps {
  onSessionTimeout: () => void;
  token: string;
}

export function ClaimsDashboard({ onSessionTimeout, token }: ClaimsDashboardProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getStatusClass = (status: string | undefined) => {
    if (!status) return 'status-default';
    if (status === 'Paid' || status === 'Approved') return 'status-success';
    if (status === 'Denied') return 'status-danger';
    if (status === 'Disputed') return 'status-warning';
    if (status.includes('Pending')) return 'status-pending';
    return 'status-default';
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const response = await fetch(`${API_URL}claims`, {
        headers: { Authorization: token },
      });
      if (response.status === 401) {
        onSessionTimeout();
        return;
      }
      if (!response.ok) {
        setError('Failed to load claims.');
        return;
      }
      const data = await response.json();
      setClaims((data.claims ?? []).map((c: any) => ({
        ...c,
        currentStatus: c.currentStatus || c.claimStatus || 'Unknown',
      })));
    } catch {
      setError('Failed to load claims.');
    } finally {
      setLoading(false);
    }
  };

  if (selectedClaimId) {
    return (
      <ClaimDetail
        claimId={selectedClaimId}
        onBack={() => setSelectedClaimId(null)}
        onSessionTimeout={onSessionTimeout}
        token={token}
      />
    );
  }

  return (
    <div className="claims-dashboard" aria-label="Claims Dashboard">
      <div className="dashboard-header">
        <h1>My Claims</h1>
        <p className="dashboard-subtitle">View and manage your insurance claims</p>
      </div>
      {loading && <div className="loading-spinner">Loading claims...</div>}
      {error && <p className="dashboard-error" role="alert">{error}</p>}
      {!loading && claims.length === 0 && !error && (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="12" y="8" width="40" height="48" rx="4" stroke="#dadce0" strokeWidth="2"/>
            <path d="M20 20h24M20 28h20M20 36h16" stroke="#dadce0" strokeWidth="2"/>
          </svg>
          <p>No claims found</p>
          <span>Claims submitted through voice, email, or chat will appear here.</span>
        </div>
      )}
      {!loading && claims.length > 0 && (
        <div className="claims-grid">
          {claims.map((claim) => (
            <button
              key={claim.claimId}
              className="claim-card"
              onClick={() => setSelectedClaimId(claim.claimId)}
            >
              <div className="claim-card-header">
                <span className="claim-id">{claim.claimId}</span>
                <span className={`claim-status-badge ${getStatusClass(claim.currentStatus)}`}>
                  {claim.currentStatus}
                </span>
              </div>
              {claim.policyNumber && (
                <div className="claim-card-detail">
                  <span className="detail-label">Policy</span>
                  <span>{claim.policyNumber}</span>
                </div>
              )}
              {claim.createdAt && (
                <div className="claim-card-detail">
                  <span className="detail-label">Filed</span>
                  <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
                </div>
              )}
              <div className="claim-card-action">View Details →</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
