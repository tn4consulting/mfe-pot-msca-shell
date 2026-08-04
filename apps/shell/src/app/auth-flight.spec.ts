import { computePkceCodeChallenge, consumeAuthFlight, generateRandomToken, storeAuthFlight } from './auth-flight';

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

  it('computePkceCodeChallenge is deterministic for the same verifier', async () => {
    const verifier = 'a'.repeat(43);
    const challengeOne = await computePkceCodeChallenge(verifier);
    const challengeTwo = await computePkceCodeChallenge(verifier);

    expect(challengeOne).toBe(challengeTwo);
    expect(challengeOne).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});
