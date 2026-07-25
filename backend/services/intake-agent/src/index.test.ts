import { INTAKE_AGENT_PACKAGE_NAME } from './index';

describe('@claims/intake-agent placeholder', () => {
  it('exposes the package name constant', () => {
    expect(INTAKE_AGENT_PACKAGE_NAME).toBe('@claims/intake-agent');
  });
});
