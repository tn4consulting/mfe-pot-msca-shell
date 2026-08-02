import { withNativeFederation } from '@angular-architects/native-federation/config';
import {
  sharedFederationDependencies,
  sharedFederationFeatures,
  sharedFederationSkip,
} from '@tn4consulting/shared-federation-config';

// Deliberately NOT sharing '@angular-architects/native-federation' itself.
// It's tempting (a remote calling loadRemoteModule to embed another remote's
// widget needs the SAME federation runtime instance the host initialized, or
// its internal promise never resolves) but sharing it breaks the host's own
// bootstrap: the host's main.ts imports `initFederation` synchronously at
// the top level, before any shared/import-map scope exists to resolve it
// from -- a chicken-and-egg failure ("Unable to resolve specifier
// '@angular-architects/native-federation'"). The fix used here instead: the
// host (which always has a working federation runtime) loads cross-remote
// widgets itself and hands the result to the consuming remote via an
// injected DI token (see the employment-life-events route below and
// `PAYMENT_HISTORY_WIDGET_LOADER` in shared-federation-runtime) rather than
// having remotes call loadRemoteModule on each other directly.
export default withNativeFederation({
  name: 'shell',

  shared: sharedFederationDependencies,
  skip: sharedFederationSkip,

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0

  features: sharedFederationFeatures,
});
