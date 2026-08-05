import { computePkceChallenge, consumeAuthFlight, generateRandomToken, storeAuthFlight } from './auth-flight';

describe('auth-flight', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns null when nothing is stored', () => {
    expect(consumeAuthFlight()).toBeNull();
  });

  it('stores and consumes the flight state exactly once', () => {
    storeAuthFlight({ state: 'abc', codeVerifier: 'def' });

    expect(consumeAuthFlight()).toEqual({ state: 'abc', codeVerifier: 'def' });
    expect(consumeAuthFlight()).toBeNull();
  });

  it('generateRandomToken produces distinct, URL-safe tokens', () => {
    const a = generateRandomToken();
    const b = generateRandomToken();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  describe('computePkceChallenge', () => {
    it('uses S256 and is deterministic for the same verifier when crypto.subtle is available', async () => {
      const verifier = 'a'.repeat(43);
      const challengeOne = await computePkceChallenge(verifier);
      const challengeTwo = await computePkceChallenge(verifier);

      expect(challengeOne).toEqual(challengeTwo);
      expect(challengeOne.codeChallengeMethod).toBe('S256');
      expect(challengeOne.codeChallenge).not.toBe(verifier);
      expect(challengeOne.codeChallenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('falls back to the plain method when crypto.subtle is unavailable (non-secure context)', async () => {
      const originalSubtle = crypto.subtle;
      Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });

      try {
        const verifier = 'a'.repeat(43);
        const result = await computePkceChallenge(verifier);
        expect(result).toEqual({ codeChallenge: verifier, codeChallengeMethod: 'plain' });
      } finally {
        Object.defineProperty(crypto, 'subtle', { value: originalSubtle, configurable: true });
      }
    });
  });
});
