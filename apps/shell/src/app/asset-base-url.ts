// Split across two statements deliberately: esbuild specially recognizes
// the inline pattern `new URL('...', import.meta.url)` and rewrites it for
// static asset bundling, which hijacks this computation in dev mode -- see
// mfe-pot-platform's CLAUDE.md.
//
// Deliberately its own module, not inlined elsewhere: `import.meta.url` is
// a syntax construct ts-jest can't downlevel to CommonJS (a hard "Cannot
// use 'import.meta' outside a module" error), so it needs to live
// somewhere a spec file can `jest.mock()` around rather than execute.
const moduleUrl = import.meta.url;
export const assetBaseUrl = new URL('.', moduleUrl).href;
