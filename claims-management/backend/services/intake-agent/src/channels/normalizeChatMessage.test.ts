import { normalizeChatMessage } from './normalizeChatMessage';

describe('normalizeChatMessage', () => {
  it('tags the normalized message with channel "Chat"', () => {
    const result = normalizeChatMessage({ message: 'My car was hit.' });

    expect(result.channel).toBe('Chat');
  });

  it('uses the chat message text as rawText, trimmed', () => {
    const result = normalizeChatMessage({ message: '  My car was hit on Main Street.  ' });

    expect(result.rawText).toBe('My car was hit on Main Street.');
  });

  it('produces an empty rawText for an empty message', () => {
    const result = normalizeChatMessage({ message: '' });

    expect(result.rawText).toBe('');
  });

  it('includes a valid ISO-8601 timestamp when sentAt is not supplied', () => {
    const before = Date.now();
    const result = normalizeChatMessage({ message: 'hi' });
    const after = Date.now();

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const parsed = new Date(result.timestamp).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it('uses the supplied sentAt timestamp when provided', () => {
    const result = normalizeChatMessage({ message: 'hi', sentAt: '2024-01-01T00:00:00.000Z' });

    expect(result.timestamp).toBe('2024-01-01T00:00:00.000Z');
  });

  it('leaves claimIdHint/policyNumberHint undefined when not supplied on the payload', () => {
    const result = normalizeChatMessage({ message: 'hi' });

    expect(result.claimIdHint).toBeUndefined();
    expect(result.policyNumberHint).toBeUndefined();
  });

  it('passes through an explicit claimId/policyNumber present on the payload', () => {
    const result = normalizeChatMessage({
      message: 'hi',
      claimId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      policyNumber: 'POL-123',
    });

    expect(result.claimIdHint).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(result.policyNumberHint).toBe('POL-123');
  });
});
