/**
 * Hand-rolled RS256 JWS verification via Web Crypto, not
 * `@tn4consulting/shared-remote-integrity`'s jose-backed `verifyRemoteManifest`
 * -- `main.tsx` (and anything it imports) runs before `initFederation()`
 * sets up the import-map/shared scope bare-specifier resolution depends
 * on, so it can't import any workspace or third-party package (see
 * `main.tsx`'s own comment, and this repo's own CLAUDE.md's "cannot
 * import any @tn4consulting/shared-* package" note -- the same
 * `external` array pitfall documented there for the plain esbuild build
 * of `main.tsx`'s own bundle is exactly why this file has zero imports).
 * Mirrors `auth-flight.ts`'s existing `crypto.subtle` usage for PKCE's
 * SHA-256 challenge.
 *
 * Byte-for-byte the same logic as `mfe-pot-job-bank-shell`'s copy of this
 * same file -- duplicated per shell rather than shared, for the same
 * reason `resolveFederationManifest` itself is already duplicated instead
 * of importing `shared-remote-registry`. Both copies (and
 * `shared-remote-integrity`'s own jose-backed version) are tested against
 * the same scenario shapes to catch drift.
 *
 * See mfe-pot/docs/plans/20260811-1500-federation-remote-loading-integrity.md.
 */

export interface RemoteTrustEntry {
  kid: string;
  publicKeyJwk: JsonWebKey;
  alg: 'RS256';
  allowedOrigins: string[];
  provisioning: 'first-party-ci' | 'manual-partner-onboarding';
}

export interface TrustedRemotesRegistry {
  version: 1;
  remotes: Record<string, RemoteTrustEntry>;
}

export interface RemoteManifestClaims {
  remoteName: string;
  iat: number;
  exp: number;
  files: Record<string, string>;
  exposesFileNames: Record<string, string>;
}

export interface RemoteEntryExposes {
  key: string;
  outFileName: string;
}

export interface RemoteEntryManifest {
  name: string;
  exposes: RemoteEntryExposes[];
}

export interface VerifiedManifestEntry {
  manifest: RemoteEntryManifest;
  claims: RemoteManifestClaims;
}

/**
 * Verifies one Strapi-supplied manifest entry: looks up the claimed remote
 * in the trust registry, checks the manifest's origin against that entry's
 * allowlist, verifies the JWS signature and its `kid`/`remoteName`/`exp`
 * claims, and re-hashes the fetched `remoteEntry.json` bytes against the
 * now-trusted claims. Returns `null` on any failure rather than throwing
 * -- an unverifiable remote is dropped from the federation manifest, not a
 * fatal error for the whole shell (same degrade-quietly posture
 * `RemoteErrorBoundary` already uses elsewhere in this family).
 */
export async function verifyManifestEntrySignature(
  remoteName: string,
  manifestUrl: string,
  manifestBytes: ArrayBuffer,
  compactJws: string,
  registry: TrustedRemotesRegistry,
): Promise<VerifiedManifestEntry | null> {
  const entry = registry.remotes[remoteName];
  if (!entry) {
    return null;
  }
  if (!entry.allowedOrigins.includes(new URL(manifestUrl).origin)) {
    return null;
  }

  const claims = await verifyJwsAgainstJwk(compactJws.trim(), entry);
  if (!claims) {
    return null;
  }
  if (claims.remoteName !== remoteName) {
    return null;
  }
  if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) {
    return null;
  }

  const actualHash = await sha384Base64(manifestBytes);
  if (claims.files['remoteEntry.json'] !== actualHash) {
    return null;
  }

  let manifest: RemoteEntryManifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as RemoteEntryManifest;
  } catch {
    return null;
  }

  return { manifest, claims };
}

async function verifyJwsAgainstJwk(
  compactJws: string,
  entry: RemoteTrustEntry,
): Promise<RemoteManifestClaims | null> {
  const parts = compactJws.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(base64UrlDecodeToString(headerB64)) as { alg?: string; kid?: string };
  } catch {
    return null;
  }
  if (header.alg !== entry.alg || header.kid !== entry.kid) {
    return null;
  }

  if (!crypto.subtle) {
    // Same non-secure-context caveat auth-flight.ts documents for PKCE --
    // SubtleCrypto only exists in a secure context (https, or localhost).
    return null;
  }

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    entry.publicKeyJwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecodeToBytes(signatureB64);

  const isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signingInput);
  if (!isValid) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecodeToString(payloadB64)) as RemoteManifestClaims;
  } catch {
    return null;
  }
}

async function sha384Base64(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-384', bytes);
  return arrayBufferToBase64(digest);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeToString(input: string): string {
  return new TextDecoder().decode(base64UrlDecodeToBytes(input));
}
