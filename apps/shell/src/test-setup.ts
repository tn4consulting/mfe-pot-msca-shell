import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import '@testing-library/jest-dom';

// jsdom's `crypto` provides getRandomValues but not `.subtle` -- needed by
// the PKCE code-challenge computation in the mock-idp login flow (see
// app/auth-flight.ts). Node's own webcrypto is a full implementation
// (including getRandomValues), so swapping it in loses nothing real
// browsers/Node itself wouldn't already provide.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// jsdom doesn't implement TextEncoder/TextDecoder at all -- needed both by
// auth-flight.ts's own PKCE digest step and, transitively, by
// react-router-dom's module-load-time code. Node's implementations are
// the same Web API surface a real browser provides.
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

// jsdom has no global `fetch` at all. Every page component here calls
// useTranslations, which fetches its own assets/i18n/<locale>.json --
// this default lets that call fail gracefully (useTranslations falls back
// to raw translation keys on any rejected/malformed response) instead of
// throwing "fetch is not defined" in specs that don't care about i18n
// content and never override it themselves. Specs that DO care about a
// real fetch call (e.g. AuthCallbackPage's token exchange) set their own
// `global.fetch` mock per test, same as job-bank's precedent.
if (!globalThis.fetch) {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
}
