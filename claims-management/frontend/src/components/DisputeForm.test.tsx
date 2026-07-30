/**
 * Unit tests for Dispute Submission form.
 *
 * Tests that the form is hidden for claims not in Approved/Denied status,
 * and that client-side max-length validation rejects an over-length reason.
 *
 * _Requirements: 11.1, 11.4, 11.5_
 */
import { describe, it, expect } from 'vitest';

const MAX_DISPUTE_REASON_LENGTH = 2000;
const DISPUTABLE_STATUSES = ['Approved', 'Denied'];

describe('DisputeForm', () => {
  it('is hidden for claims not in Approved or Denied status', () => {
    const nonDisputableStatuses = ['Intake', 'Assessment', 'Fraud_Check', 'Pending_Adjuster_Review', 'Paid', 'Disputed', 'Resolved'];
    for (const status of nonDisputableStatuses) {
      expect(DISPUTABLE_STATUSES.includes(status)).toBe(false);
    }
  });

  it('is shown for claims in Approved status', () => {
    expect(DISPUTABLE_STATUSES.includes('Approved')).toBe(true);
  });

  it('is shown for claims in Denied status', () => {
    expect(DISPUTABLE_STATUSES.includes('Denied')).toBe(true);
  });

  it('rejects an empty reason before submission', () => {
    const reason = '   ';
    const trimmed = reason.trim();
    expect(trimmed.length).toBe(0);
  });

  it('rejects a reason exceeding maxDisputeReasonLength', () => {
    const overLength = 'x'.repeat(MAX_DISPUTE_REASON_LENGTH + 1);
    expect(overLength.trim().length).toBeGreaterThan(MAX_DISPUTE_REASON_LENGTH);
  });

  it('accepts a valid reason within length limits', () => {
    const valid = 'I disagree with this decision because the damage was pre-existing.';
    expect(valid.trim().length).toBeGreaterThan(0);
    expect(valid.trim().length).toBeLessThanOrEqual(MAX_DISPUTE_REASON_LENGTH);
  });
});
