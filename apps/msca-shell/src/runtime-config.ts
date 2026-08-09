import { getRuntimeConfig } from '@tn4consulting/shared-runtime-config';

/**
 * Only imported from lazy-loaded route components (login-page,
 * auth-callback-page), which run after Native Federation's import-map/shared
 * scope exists -- unlike `main.ts`, which can't use this package at all (see
 * CLAUDE.md's bare-specifier-from-main.ts gotcha). `getRuntimeConfig` (not
 * `fetchRuntimeConfig`) is correct here specifically because shell is always
 * the top-level navigated page, never a federated remote.
 */
export const runtimeConfig = getRuntimeConfig({
  mockIdpBaseUrl: 'http://localhost:3005',
  // undefined -- no local collector needed for plain `nx serve`, see
  // shared-observability's initBrowserObservability, called from
  // bootstrap.tsx.
  otelExporterOtlpEndpoint: undefined as string | undefined,
  // For LifeEventsHubPage's CMS-driven hub-tile content -- same value as
  // main.tsx's own ShellRuntimeConfig.strapiBaseUrl dev default, kept in
  // sync by hand since main.tsx can't import this module (see its own
  // bare-specifier comment) and this module can't read main.tsx's value.
  strapiBaseUrl: 'http://localhost:1337' as string | undefined,
});
