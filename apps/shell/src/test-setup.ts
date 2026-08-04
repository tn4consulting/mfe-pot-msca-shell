import { webcrypto } from 'node:crypto';
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// jsdom's `crypto` provides getRandomValues but not `.subtle` -- needed by
// the PKCE code-challenge computation in the mock-idp login flow (see
// app/auth-flight.ts). Node's own webcrypto is a full implementation
// (including getRandomValues), so swapping it in loses nothing real
// browsers/Node itself wouldn't already provide.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
