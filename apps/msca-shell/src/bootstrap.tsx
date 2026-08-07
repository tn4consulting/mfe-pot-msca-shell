import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { RemoteModuleLoader } from '@tn4consulting/shared-federation-runtime';
import { App } from './app/App';

export function bootstrap(loadRemoteModule: RemoteModuleLoader): void {
  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(createElement(App, { loadRemoteModule }));
  }
}
