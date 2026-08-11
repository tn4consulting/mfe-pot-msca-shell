import { verifyManifestEntrySignature, type TrustedRemotesRegistry } from './verify-manifest-signature';

/**
 * Exercises the same scenarios as `shared-remote-integrity`'s
 * `verify-remote-manifest.spec.ts` -- this file's `verifyManifestEntrySignature`
 * is a hand-rolled, `crypto.subtle`-based duplicate of that package's
 * jose-backed `verifyRemoteManifest`, kept independent specifically
 * because `main.tsx` can't import the real package (see this file's own
 * header comment). Testing both against the same shape of fixture is how
 * drift between the two independent implementations gets caught.
 */
describe('verifyManifestEntrySignature', () => {
  const remoteName = 'dashboard-mfe';
  const kid = 'dashboard-mfe-test';
  const allowedOrigin = 'https://dashboard-mfe.example.com';
  const manifestUrl = `${allowedOrigin}/remoteEntry.json`;
  const manifestPayload = JSON.stringify({
    name: remoteName,
    exposes: [
      { key: './Component', outFileName: 'Component.js' },
      { key: './PaymentHistoryWidget', outFileName: 'PaymentHistoryWidget.js' },
    ],
  });
  const manifestBytes = new TextEncoder().encode(manifestPayload).buffer;

  let registry: TrustedRemotesRegistry;
  let validJws: string;

  async function sha384Base64(bytes: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-384', bytes);
    const digestBytes = new Uint8Array(digest);
    let binary = '';
    for (const byte of digestBytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  function base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function sign(
    payload: Record<string, unknown>,
    privateKey: CryptoKey,
    protectedKid = kid,
  ): Promise<string> {
    const header = { alg: 'RS256', kid: protectedKid };
    const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, signingInput);
    const signatureB64 = base64UrlEncode(new Uint8Array(signature));
    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }

  let privateKey: CryptoKey;
  let claims: Record<string, unknown>;

  beforeAll(async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    );
    privateKey = keyPair.privateKey;
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

    registry = {
      version: 1,
      remotes: {
        [remoteName]: { kid, publicKeyJwk, alg: 'RS256', allowedOrigins: [allowedOrigin], provisioning: 'first-party-ci' },
      },
    };

    const manifestHash = await sha384Base64(manifestBytes);
    claims = {
      remoteName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      files: { 'remoteEntry.json': manifestHash },
      exposesFileNames: {
        './Component': 'Component.js',
        './PaymentHistoryWidget': 'PaymentHistoryWidget.js',
      },
    };

    validJws = await sign(claims, privateKey);
  });

  it('verifies a validly signed, unmodified manifest and returns the parsed manifest + claims', async () => {
    const result = await verifyManifestEntrySignature(
      remoteName,
      manifestUrl,
      manifestBytes,
      validJws,
      registry,
    );
    expect(result).not.toBeNull();
    expect(result?.manifest.name).toBe(remoteName);
    expect(result?.manifest.exposes).toHaveLength(2);
    expect(result?.claims.remoteName).toBe(remoteName);
  });

  it('rejects an unknown remoteName (no registry entry)', async () => {
    const result = await verifyManifestEntrySignature(
      'unknown-mfe',
      manifestUrl,
      manifestBytes,
      validJws,
      registry,
    );
    expect(result).toBeNull();
  });

  it('rejects a manifest served from an unexpected origin', async () => {
    const result = await verifyManifestEntrySignature(
      remoteName,
      'https://evil.example.com/remoteEntry.json',
      manifestBytes,
      validJws,
      registry,
    );
    expect(result).toBeNull();
  });

  it('rejects a tampered manifest whose bytes no longer match the signed hash', async () => {
    const tamperedBytes = new TextEncoder().encode(
      JSON.stringify({ name: remoteName, exposes: [{ key: './Component', outFileName: 'Evil.js' }] }),
    ).buffer;
    const result = await verifyManifestEntrySignature(
      remoteName,
      manifestUrl,
      tamperedBytes,
      validJws,
      registry,
    );
    expect(result).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const parts = validJws.split('.');
    const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;
    const result = await verifyManifestEntrySignature(remoteName, manifestUrl, manifestBytes, tampered, registry);
    expect(result).toBeNull();
  });

  it('rejects a signature whose kid does not match the registered kid', async () => {
    const rotatedRegistry: TrustedRemotesRegistry = {
      version: 1,
      remotes: { [remoteName]: { ...registry.remotes[remoteName], kid: 'a-newer-kid' } },
    };
    const result = await verifyManifestEntrySignature(
      remoteName,
      manifestUrl,
      manifestBytes,
      validJws,
      rotatedRegistry,
    );
    expect(result).toBeNull();
  });

  it('rejects a claimed remoteName that does not match the name being verified', async () => {
    const forgedJws = await sign({ ...claims, remoteName: 'job-bank-mfe' }, privateKey);
    const result = await verifyManifestEntrySignature(
      remoteName,
      manifestUrl,
      manifestBytes,
      forgedJws,
      registry,
    );
    expect(result).toBeNull();
  });

  it('rejects an expired signature', async () => {
    const expiredJws = await sign(
      { ...claims, exp: Math.floor(Date.now() / 1000) - 60 },
      privateKey,
    );
    const result = await verifyManifestEntrySignature(
      remoteName,
      manifestUrl,
      manifestBytes,
      expiredJws,
      registry,
    );
    expect(result).toBeNull();
  });
});
