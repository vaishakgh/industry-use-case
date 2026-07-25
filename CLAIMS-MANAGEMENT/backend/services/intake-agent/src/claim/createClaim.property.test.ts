/**
 * Property-based test for unique Claim_ID allocation on claim creation.
 *
 * See design.md: Property 1: Unique claim creation on new session.
 */
import fc from 'fast-check';
import type { Claim } from '@claims/shared';
import { CHANNEL_VALUES } from '@claims/shared';
import { ClaimIdCollisionError, type ClaimsRepository } from './claimsRepository';
import { createClaimWithUniqueId, type ClaimData } from './createClaim';

/**
 * A fake, in-memory `ClaimsRepository` that tracks which `claimId`s have
 * been "written" and simulates the real `DynamoDbClaimsRepository`'s
 * conditional-`PutItem` behavior: a `putClaimIfNotExists` call for a
 * `claimId` that already exists in the store throws
 * `ClaimIdCollisionError` instead of overwriting the existing item.
 */
class FakeClaimsRepository implements ClaimsRepository {
  readonly store = new Map<string, Claim>();

  async putClaimIfNotExists(claim: Claim): Promise<void> {
    if (this.store.has(claim.claimId)) {
      throw new ClaimIdCollisionError(claim.claimId);
    }
    this.store.set(claim.claimId, claim);
  }
}

/** Arbitrary generator for `ClaimData` (a `Claim` minus its `claimId`). */
const claimDataArbitrary: fc.Arbitrary<ClaimData> = fc.record({
  policyNumber: fc.string({ minLength: 1, maxLength: 20 }),
  claimStatus: fc.constant('Intake' as const),
  structuredFields: fc.record({
    policyNumber: fc.constant({ value: null, confidenceScore: null, confirmed: false }),
    incidentDate: fc.constant({ value: null, confidenceScore: null, confirmed: false }),
    incidentLocation: fc.constant({ value: null, confidenceScore: null, confirmed: false }),
    damageDescription: fc.constant({ value: null, confidenceScore: null, confirmed: false }),
  }),
  originalChannel: fc.constantFrom(...CHANNEL_VALUES),
  photoRefs: fc.constant([]),
  documentRefs: fc.constant([]),
  severityRating: fc.constant(null),
  estimatedRepairCost: fc.constant(null),
  damageAssessmentConfidence: fc.constant(null),
  photoResubmissionCount: fc.constant(0),
  fraudFlag: fc.constant(false),
  fraudIndicators: fc.constant([]),
  statusHistory: fc.constant([]),
  adjusterId: fc.constant(null),
  fraudAnalystId: fc.constant(null),
  dispute: fc.constant(null),
  policyholderIds: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
}) satisfies fc.Arbitrary<ClaimData>;

describe('createClaimWithUniqueId property tests', () => {
  // Feature: claims-management-fnol, Property 1: Unique claim creation on new session
  it('produces distinct, non-empty claimIds and a collision-free repository for any sequence of creation calls', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(claimDataArbitrary, { minLength: 1, maxLength: 30 }), async (claimDataList) => {
        const repository = new FakeClaimsRepository();
        const createdClaims: Claim[] = [];

        for (const claimData of claimDataList) {
          const claim = await createClaimWithUniqueId(claimData, repository);
          createdClaims.push(claim);
        }

        // Every returned Claim has a distinct, non-empty claimId.
        for (const claim of createdClaims) {
          expect(claim.claimId).toBeTruthy();
          expect(claim.claimId.length).toBeGreaterThan(0);
        }
        const claimIds = createdClaims.map((claim) => claim.claimId);
        expect(new Set(claimIds).size).toBe(claimIds.length);

        // The fake repository ends up containing exactly N claims with all
        // unique keys -- no overwrites, no collisions surfaced to the
        // caller under normal (non-adversarial-forced-collision) conditions.
        expect(repository.store.size).toBe(claimDataList.length);
        expect(new Set(repository.store.keys()).size).toBe(claimDataList.length);

        // Every claimId returned to the caller is actually present in the
        // repository, keyed under itself, with matching data.
        for (const claim of createdClaims) {
          expect(repository.store.get(claim.claimId)).toEqual(claim);
        }
      }),
      { numRuns: 100 },
    );
  });
});
