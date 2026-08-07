const FLIGHT_STORAGE_KEY = 'mfe-pot-auth-flight';

/**
 * Transient CSRF/PKCE-binding state for the in-flight redirect to mock-idp
 * and back -- deliberately not the AuthSession key (session-sync.ts):
 * there is no session yet at this point, and the browser does a real
 * full-page navigation away and back, so this has to survive in
 * sessionStorage rather than an in-memory variable.
 */
export interface AuthFlight {
  state: string;
  codeVerifier: string;
}

export function storeAuthFlight(flight: AuthFlight): void {
  sessionStorage.setItem(FLIGHT_STORAGE_KEY, JSON.stringify(flight));
}

/** Reads and clears the flight state in one step -- it's one-time-use, same as mock-idp's own authorization code. */
export function consumeAuthFlight(): AuthFlight | null {
  const raw = sessionStorage.getItem(FLIGHT_STORAGE_KEY);
  sessionStorage.removeItem(FLIGHT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthFlight;
  } catch {
    return null;
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Used for both `state` (CSRF binding) and the PKCE `code_verifier` -- both just need to be opaque and unguessable. */
export function generateRandomToken(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

export interface PkceChallenge {
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
}

/**
 * RFC 7636 PKCE. Prefers `S256` (base64url(SHA-256(code_verifier))), but
 * falls back to `plain` (code_challenge === code_verifier) when
 * `crypto.subtle` isn't available -- SubtleCrypto only exists in a secure
 * context (HTTPS, or the literal hostname `localhost`), so a plain-HTTP
 * deployment on a hostname like `msca-shell.mfe-pot.local` has none at all
 * (confirmed the hard way: `TypeError: Cannot read properties of undefined
 * (reading 'digest')` clicking sign-in there). `plain` is RFC 7636's own
 * documented fallback for exactly this case, not a workaround invented
 * here. mock-idp's `/token` handler verifies both methods.
 */
export async function computePkceChallenge(codeVerifier: string): Promise<PkceChallenge> {
  if (!crypto.subtle) {
    return { codeChallenge: codeVerifier, codeChallengeMethod: 'plain' };
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return { codeChallenge: base64UrlEncode(new Uint8Array(digest)), codeChallengeMethod: 'S256' };
}
