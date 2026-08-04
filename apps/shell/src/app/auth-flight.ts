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

/** RFC 7636 PKCE `S256` transform: base64url(SHA-256(code_verifier)). */
export async function computePkceCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return base64UrlEncode(new Uint8Array(digest));
}
