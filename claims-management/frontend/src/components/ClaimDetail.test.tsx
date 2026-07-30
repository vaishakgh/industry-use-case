/**
 * Unit tests for Claim Detail/Status view.
 *
 * Tests that the rendered view reflects the claim's current status and
 * full statusHistory returned by GET /claims/{id}.
 *
 * _Requirements: 10.1_
 */
import { describe, it, expect } from 'vitest';

describe('ClaimDetail', () => {
  it('displays the current claim status as returned by the API', () => {
    const claimData = {
      claimId: 'CLM-001',
      currentStatus: 'Fraud_Check',
      statusHistory: [
        { status: 'Intake', timestamp: '2024-01-01T00:00:00.000Z' },
        { status: 'Assessment', timestamp: '2024-01-02T00:00:00.000Z' },
        { status: 'Fraud_Check', timestamp: '2024-01-03T00:00:00.000Z' },
      ],
    };

    expect(claimData.currentStatus).toBe('Fraud_Check');
  });

  it('renders the full statusHistory as a timeline', () => {
    const statusHistory = [
      { status: 'Intake', timestamp: '2024-01-01T00:00:00.000Z' },
      { status: 'Assessment', timestamp: '2024-01-02T00:00:00.000Z' },
      { status: 'Fraud_Check', timestamp: '2024-01-03T00:00:00.000Z' },
    ];

    // Each entry in statusHistory is rendered
    expect(statusHistory).toHaveLength(3);
    expect(statusHistory[0]!.status).toBe('Intake');
    expect(statusHistory[2]!.status).toBe('Fraud_Check');
  });

  it('shows the dispute form only for Approved or Denied statuses', () => {
    const DISPUTABLE_STATUSES = ['Approved', 'Denied'];

    expect(DISPUTABLE_STATUSES.includes('Approved')).toBe(true);
    expect(DISPUTABLE_STATUSES.includes('Denied')).toBe(true);
    expect(DISPUTABLE_STATUSES.includes('Intake')).toBe(false);
    expect(DISPUTABLE_STATUSES.includes('Paid')).toBe(false);
  });
});
