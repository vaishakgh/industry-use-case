import { normalizeEmailMessage } from './normalizeEmailMessage';

describe('normalizeEmailMessage', () => {
  it('tags the normalized message with channel "Email"', () => {
    const result = normalizeEmailMessage({ from: 'a@example.com', body: 'My car was hit.' });

    expect(result.channel).toBe('Email');
  });

  it('builds rawText from subject and body, separated by a blank line', () => {
    const result = normalizeEmailMessage({
      from: 'a@example.com',
      subject: 'Claim for my car accident',
      body: 'My car was hit on Main Street yesterday.',
    });

    expect(result.rawText).toBe('Claim for my car accident\n\nMy car was hit on Main Street yesterday.');
  });

  it('falls back to only the body when subject is absent', () => {
    const result = normalizeEmailMessage({ from: 'a@example.com', body: 'My car was hit.' });

    expect(result.rawText).toBe('My car was hit.');
  });

  it('trims whitespace from subject and body', () => {
    const result = normalizeEmailMessage({
      from: 'a@example.com',
      subject: '  Claim  ',
      body: '  My car was hit.  ',
    });

    expect(result.rawText).toBe('Claim\n\nMy car was hit.');
  });

  it('includes a valid ISO-8601 timestamp when receivedAt is not supplied', () => {
    const before = Date.now();
    const result = normalizeEmailMessage({ from: 'a@example.com', body: 'hi' });
    const after = Date.now();

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const parsed = new Date(result.timestamp).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it('uses the supplied receivedAt timestamp when provided', () => {
    const result = normalizeEmailMessage({
      from: 'a@example.com',
      body: 'hi',
      receivedAt: '2024-01-01T00:00:00.000Z',
    });

    expect(result.timestamp).toBe('2024-01-01T00:00:00.000Z');
  });

  it('leaves claimIdHint/policyNumberHint undefined when not supplied on the payload', () => {
    const result = normalizeEmailMessage({ from: 'a@example.com', body: 'hi' });

    expect(result.claimIdHint).toBeUndefined();
    expect(result.policyNumberHint).toBeUndefined();
  });

  it('passes through an explicit claimId/policyNumber present on the payload', () => {
    const result = normalizeEmailMessage({
      from: 'a@example.com',
      body: 'hi',
      claimId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      policyNumber: 'POL-123',
    });

    expect(result.claimIdHint).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(result.policyNumberHint).toBe('POL-123');
  });
});
