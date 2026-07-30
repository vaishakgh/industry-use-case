import { useState, useEffect } from 'react';
import { ClaimDetail } from './ClaimDetail';

interface Claim {
  claimId: string;
  currentStatus: string;
}

interface ClaimsDashboardProps {
  onSessionTimeout: () => void;
}

/**
 * Claims List/Dashboard view.
 *
 * Fetches and renders the list of claims scoped to the authenticated
 * customer via the Portal API.
 *
 * _Requirements: 9.4_
 */
export function ClaimsDashboard({ onSessionTimeout }: ClaimsDashboardProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const response = await fetch('/api/claims');
      if (response.status === 401) {
        onSessionTimeout();
        return;
      }
      if (!response.ok) {
        setError('Failed to load claims.');
        return;
      }
      const data = await response.json();
      setClaims(data.claims ?? []);
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
      />
    );
  }

  return (
    <div className="claims-dashboard" aria-label="Claims Dashboard">
      <h1>My Claims</h1>
      {loading && <p>Loading claims...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && claims.length === 0 && !error && <p>No claims found.</p>}
      <ul role="list" aria-label="Claims list">
        {claims.map((claim) => (
          <li key={claim.claimId}>
            <button onClick={() => setSelectedClaimId(claim.claimId)}>
              {claim.claimId} — {claim.currentStatus}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
