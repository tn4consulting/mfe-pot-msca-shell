import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { RemoteModuleLoader } from '@tn4consulting/shared-federation-runtime';
import { initBrowserObservability } from '@tn4consulting/shared-observability';
import { App } from './app/App';
import { runtimeConfig } from './runtime-config';

export function bootstrap(loadRemoteModule: RemoteModuleLoader): void {
  // Hosts are never federated into anything else, so this is the one real
  // entry point -- unlike a remote, which wires this from its own
  // runtime-config.ts's loadRuntimeConfig instead (bootstrap.tsx never runs
  // when a remote is loaded federated into a shell). No BFF of its own, so
  // no propagateTraceHeaderCorsUrls needed.
  initBrowserObservability({
    serviceName: 'msca-shell',
    otlpEndpoint: runtimeConfig.otelExporterOtlpEndpoint,
  });

  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(createElement(App, { loadRemoteModule }));
  }
}
