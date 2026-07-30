import type { ClaimSession } from '@claims/shared';
import type { ClaimSessionsTable } from '../claimSessions';
import { lookupClaimSession } from './lookupClaimSession';

function buildSession(overrides: Partial<ClaimSession> = {}): ClaimSession {
  return {
    claimId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    policyNumber: 'POL-123',
    claimStatus: 'Intake',
    channelHistory: [{ channel: 'Chat', timestamp: '2024-01-01T00:00:00.000Z' }],
    fieldAttemptCounts: {},
    voiceRetryCount: 0,
    confirmAttemptCounts: {},
    expiresAt: 1234567890,
    ...overrides,
  };
}

function buildFakeTable(sessions: ClaimSession[]): ClaimSessionsTable {
  return {
    getClaimSession: async (claimId: string) =>
      sessions.find((s) => s.claimId === claimId),
    putClaimSession: async () => {},
    updateClaimSession: async (claimId: string) => {
      const s = sessions.find((s) => s.claimId === claimId);
      if (!s) throw new Error('not found');
      return s;
    },
    queryByPolicyNumberAndStatus: async (policyNumber: string, claimStatus) =>
      sessions.filter(
        (s) => s.policyNumber === policyNumber && s.claimStatus === claimStatus,
      ),
  };
}

describe('lookupClaimSession', () => {
  describe('by claimId', () => {
    it('returns found when session exists with Intake status', async () => {
      const session = buildSession();
      const table = buildFakeTable([session]);

      const result = await lookupClaimSession({ type: 'claimId', claimId: session.claimId }, table);

      expect(result).toEqual({ outcome: 'found', session });
    });

    it('returns not_found when session does not exist', async () => {
      const table = buildFakeTable([]);

      const result = await lookupClaimSession({ type: 'claimId', claimId: 'nonexistent' }, table);

      expect(result).toEqual({ outcome: 'not_found' });
    });

    it('returns not_found when session exists but status is not Intake', async () => {
      const session = buildSession({ claimStatus: 'Assessment' });
      const table = buildFakeTable([session]);

      const result = await lookupClaimSession({ type: 'claimId', claimId: session.claimId }, table);

      expect(result).toEqual({ outcome: 'not_found' });
    });
  });

  describe('by policyNumber', () => {
    it('returns found when exactly one session matches', async () => {
      const session = buildSession({ policyNumber: 'POL-999' });
      const table = buildFakeTable([session]);

      const result = await lookupClaimSession({ type: 'policyNumber', policyNumber: 'POL-999' }, table);

      expect(result).toEqual({ outcome: 'found', session });
    });

    it('returns not_found when no sessions match', async () => {
      const table = buildFakeTable([]);

      const result = await lookupClaimSession({ type: 'policyNumber', policyNumber: 'POL-000' }, table);

      expect(result).toEqual({ outcome: 'not_found' });
    });

    it('returns ambiguous when multiple sessions match', async () => {
      const sessionA = buildSession({ claimId: 'claim-a', policyNumber: 'POL-123' });
      const sessionB = buildSession({ claimId: 'claim-b', policyNumber: 'POL-123' });
      const table = buildFakeTable([sessionA, sessionB]);

      const result = await lookupClaimSession({ type: 'policyNumber', policyNumber: 'POL-123' }, table);

      expect(result).toEqual({ outcome: 'ambiguous', sessions: [sessionA, sessionB] });
    });
  });
});
