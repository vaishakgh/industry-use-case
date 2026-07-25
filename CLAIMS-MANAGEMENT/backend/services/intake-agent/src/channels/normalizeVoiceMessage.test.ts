import { normalizeVoiceMessage } from './normalizeVoiceMessage';

describe('normalizeVoiceMessage', () => {
  it('tags the normalized message with channel "Voice"', () => {
    const result = normalizeVoiceMessage([{ text: 'hello', confidence: 0.9 }]);

    expect(result.channel).toBe('Voice');
  });

  it('concatenates segment texts in order, separated by a single space', () => {
    const result = normalizeVoiceMessage([
      { text: 'My car was hit', confidence: 0.95 },
      { text: 'on Main Street', confidence: 0.6 },
      { text: 'yesterday afternoon', confidence: 0.8 },
    ]);

    expect(result.rawText).toBe('My car was hit on Main Street yesterday afternoon');
  });

  it('trims segment text and drops empty/whitespace-only segments', () => {
    const result = normalizeVoiceMessage([
      { text: '  hello  ', confidence: 0.9 },
      { text: '   ', confidence: 0.5 },
      { text: 'world', confidence: 0.9 },
    ]);

    expect(result.rawText).toBe('hello world');
  });

  it('produces an empty rawText for an empty segment list', () => {
    const result = normalizeVoiceMessage([]);

    expect(result.rawText).toBe('');
  });

  it('includes a valid ISO-8601 timestamp when none is supplied', () => {
    const before = Date.now();
    const result = normalizeVoiceMessage([{ text: 'hi', confidence: 0.9 }]);
    const after = Date.now();

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const parsed = new Date(result.timestamp).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it('uses the supplied timestamp when provided', () => {
    const result = normalizeVoiceMessage([{ text: 'hi', confidence: 0.9 }], {
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(result.timestamp).toBe('2024-01-01T00:00:00.000Z');
  });

  it('leaves claimIdHint/policyNumberHint undefined when not supplied', () => {
    const result = normalizeVoiceMessage([{ text: 'hi', confidence: 0.9 }]);

    expect(result.claimIdHint).toBeUndefined();
    expect(result.policyNumberHint).toBeUndefined();
  });

  it('passes through explicitly supplied claimIdHint/policyNumberHint', () => {
    const result = normalizeVoiceMessage([{ text: 'hi', confidence: 0.9 }], {
      claimIdHint: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      policyNumberHint: 'POL-123',
    });

    expect(result.claimIdHint).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(result.policyNumberHint).toBe('POL-123');
  });
});
