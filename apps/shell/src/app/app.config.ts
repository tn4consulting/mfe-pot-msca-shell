import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { provideMfeTransloco } from '@tn4consulting/shared-i18n';
import { REMOTE_MODULE_LOADER } from '@tn4consulting/shared-federation-runtime';
import { appRoutes } from './app.routes';

// import.meta.url reflects wherever THIS bundled chunk is actually served
// from (this app's own origin), not the shell's -- required so translation
// files resolve correctly once federated. Safe to use here (unlike
// main.ts): app.config.ts is only ever reached via the lazy `./bootstrap`
// chain, after Native Federation's shared scope already exists.
// Split across two statements deliberately: Vite/esbuild specially
// recognize the inline pattern `new URL('...', import.meta.url)` and
// rewrite it for static asset bundling, which hijacks this computation in
// dev mode (it resolves to a dev-server /@fs/ disk path instead of this
// app's actual serving origin). Storing import.meta.url first avoids that.
const moduleUrl = import.meta.url;
const assetBaseUrl = new URL('.', moduleUrl).href;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideMfeTransloco(assetBaseUrl),
    // `RemoteRouteHost` (a plain Nx library) doesn't import
    // `@angular-architects/native-federation` itself -- doing so risks
    // getting bundled its own disconnected copy of the package, separate
    // from the one `main.ts` initializes (see remote-module-loader.token.ts
    // for the full story). This app-level file is where native federation's
    // builder reliably dedupes the import with main.ts's, so it's provided
    // here and injected via DI instead.
    { provide: REMOTE_MODULE_LOADER, useValue: loadRemoteModule },
  ],
};
