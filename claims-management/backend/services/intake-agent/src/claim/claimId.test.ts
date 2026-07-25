import { generateClaimId } from './claimId';

describe('generateClaimId', () => {
  it('produces a 26-character, Crockford-base32 ULID string', () => {
    const claimId = generateClaimId();

    expect(claimId).toHaveLength(26);
    expect(claimId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('produces a fresh id on every call (no accidental caching/memoization)', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateClaimId()));

    expect(ids.size).toBe(50);
  });

  it('produces ids that are lexicographically sortable by generation order', async () => {
    const first = generateClaimId();
    // ULIDs encode millisecond timestamps; wait past a millisecond boundary
    // so the two ids are guaranteed to have different timestamp components.
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = generateClaimId();

    expect(first < second).toBe(true);
  });
});
