// This app's tsconfig uses the classic JSX transform (jsxFactory:
// React.createElement) -- see build/build.mjs's own comment for why:
// the automatic transform's synthesized `react/jsx-runtime` import fails
// to resolve once react is a federation-shared external. `import * as
// React` is required for JSX to compile under that transform, even
// though it looks unused.
import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { RemoteModuleLoader, RemoteModuleLoaderContext } from '@tn4consulting/shared-federation-runtime';
import { AppFrame } from './AppFrame';
import { AppRoutes } from './routes';

export interface AppProps {
  loadRemoteModule: RemoteModuleLoader;
}

export function App({ loadRemoteModule }: AppProps) {
  return (
    <RemoteModuleLoaderContext.Provider value={loadRemoteModule}>
      <BrowserRouter>
        <AppFrame>
          <AppRoutes />
        </AppFrame>
      </BrowserRouter>
    </RemoteModuleLoaderContext.Provider>
  );
}
