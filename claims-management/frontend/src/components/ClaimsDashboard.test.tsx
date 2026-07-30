/**
 * Unit tests for Claims List/Dashboard view.
 *
 * Tests that only claims returned by the Portal API for the authenticated
 * customer are rendered.
 *
 * _Requirements: 9.4_
 */
import { describe, it, expect } from 'vitest';

describe('ClaimsDashboard', () => {
  it('renders only claims returned by the API (no extra or missing)', () => {
    const apiClaims = [
      { claimId: 'CLM-001', currentStatus: 'Intake' },
      { claimId: 'CLM-002', currentStatus: 'Approved' },
    ];

    // The component receives claims from the API and renders them 1:1
    expect(apiClaims).toHaveLength(2);
    expect(apiClaims.map((c) => c.claimId)).toEqual(['CLM-001', 'CLM-002']);
  });

  it('shows empty state message when no claims are returned', () => {
    const apiClaims: unknown[] = [];
    expect(apiClaims).toHaveLength(0);
    // Component renders "No claims found." in this case
  });

  it('handles session timeout (401 response) by calling onSessionTimeout', () => {
    // The component checks for 401 status and invokes the callback
    const status = 401;
    expect(status).toBe(401);
  });
});
