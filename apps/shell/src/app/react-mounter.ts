import { ComponentType, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ReactMounter } from '@tn4consulting/shared-federation-runtime';

/**
 * The one place this app imports `react`/`react-dom` directly -- see
 * `REACT_MOUNTER`'s own doc in shared-federation-runtime for why the
 * library that consumes this can't import them itself. Provided in
 * app.config.ts, the same app-level file that provides
 * `REMOTE_MODULE_LOADER`, for the identical dedupe reason: this is where
 * Native Federation's builder reliably resolves the shared singleton
 * (`react`/`react-dom` declared in federation.config.mjs via
 * `@tn4consulting/shared-federation-config/react`) to the same instance a
 * federated React remote's own bundle uses -- calling `createRoot`/
 * `createElement` from a second, disconnected copy throws "invalid hook
 * call" the moment the mounted component uses a hook.
 */
export const mountReactRemote: ReactMounter = (element, Component) => {
  const root: Root = createRoot(element);
  root.render(createElement(Component as ComponentType));
  return {
    unmount: () => root.unmount(),
  };
};
