import { SHARED_PACKAGE_NAME, CLAIM_STATUS_VALUES, type Claim } from './index';

describe('@claims/shared', () => {
  it('exposes the package name constant', () => {
    expect(SHARED_PACKAGE_NAME).toBe('@claims/shared');
  });

  it('re-exports domain enums and types from the package root', () => {
    expect(CLAIM_STATUS_VALUES).toContain('Approved');

    const claim: Pick<Claim, 'claimId' | 'claimStatus'> = {
      claimId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      claimStatus: 'Intake',
    };
    expect(claim.claimStatus).toBe('Intake');
  });
});
