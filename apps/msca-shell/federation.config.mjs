import { withNativeFederation } from '@softarc/native-federation/config';
import {
  sharedFederationRuntimeDependency,
  sharedReactFederationDependencies,
  sharedUiScdsCoreFederationDependency,
} from '@tn4consulting/shared-federation-config/react';

// React host -- imports the framework-agnostic core's config API
// (@softarc/native-federation/config), not the Angular wrapper's
// re-export, since this app no longer has Angular installed. Shares
// react/react-dom (the shell's own bundle renders a federated remote's
// exported `App` directly in its own React tree -- see RemoteRouteHost in
// shared-federation-runtime -- so it must resolve the same React instance
// a remote's bundle uses, or risk "invalid hook call" against a second,
// disconnected copy) plus shared-federation-runtime itself (its whole
// purpose -- RemoteModuleLoaderContext, the widget-loader Contexts -- is
// Context identity crossing the federation boundary, which requires every
// participant to resolve the exact same module instance; see
// shared-federation-config/react's own doc on why this is a separate
// export from sharedReactFederationDependencies), plus
// @tn4consulting/shared-ui-scds-core (this app renders its
// scds-header/scds-sidebar/scds-footer/etc. app-frame components directly
// -- GCDS has been removed from the family entirely, and shell never
// shared it in the first place despite rendering it directly; sharing
// SCDS here closes that same gap now that shell is a heavy direct
// consumer).
//
// Deliberately NOT sharing '@softarc/native-federation' itself. It's
// tempting (a remote calling loadRemoteModule to embed another remote's
// widget needs the SAME federation runtime instance the host initialized,
// or its internal promise never resolves) but sharing it breaks the
// host's own bootstrap: main.tsx imports `initFederation` synchronously at
// the top level, before any shared/import-map scope exists to resolve it
// from -- a chicken-and-egg failure ("Unable to resolve specifier
// '@softarc/native-federation-orchestrator'"). The fix used here instead:
// the host (which always has a working federation runtime) loads
// cross-remote widgets itself and hands the result to the consuming
// remote via a React Context (see app/routes.tsx and the widget-loader
// Contexts in shared-federation-runtime) rather than having remotes call
// loadRemoteModule on each other directly.
export default withNativeFederation({
  name: 'msca-shell',

  shared: {
    ...sharedReactFederationDependencies,
    ...sharedFederationRuntimeDependency,
    ...sharedUiScdsCoreFederationDependency,
  },

  // `ignoreUnusedDeps` (native federation's default: true) statically
  // analyzes every exposed module's import graph to prune shared
  // dependencies nothing actually reaches -- but shell exposes nothing
  // at all (a pure federation host, never itself federated into another
  // app), so it has no entry point for that analysis to start from at
  // all. Left at its default, the build throws outright ("native-federation
  // is missing an entryPoint!") rather than degrading to "nothing to
  // prune" -- confirmed directly against a real build. Explicitly off
  // here since there's no exposed-module graph to optimize against in
  // the first place, not because the optimization itself is unwanted.
  features: {
    ignoreUnusedDeps: false,
  },
});
