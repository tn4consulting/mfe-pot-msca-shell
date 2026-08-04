/**
 * Thin seam around a real full-page navigation -- jsdom doesn't implement
 * `window.location.href` assignment (it no-ops with a "not implemented:
 * navigation" console error rather than actually updating `.href`), so
 * this indirection is what makes the redirect-to-mock-idp flow spyable in
 * tests.
 */
export function redirectTo(url: string): void {
  window.location.href = url;
}
