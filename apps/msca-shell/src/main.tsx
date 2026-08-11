// Bundled into main.js as an entry-point CSS import; esbuild extracts it
// to a sibling main.css (see index.html's <link>) since federated remotes
// don't get their own <link> tag the way a plain Angular CLI build's
// `styles` build option used to inject one automatically.
import './styles.css';
import { initFederation } from '@softarc/native-federation-orchestrator';
// Relative imports, not bare specifiers -- safe from this file despite the
// bare-specifier constraint documented below, since esbuild resolves them
// directly rather than through the not-yet-existing import map. See
// mfe-pot/docs/plans/20260811-1500-federation-remote-loading-integrity.md.
import trustedRemotes from './generated/trusted-remotes.json';
import {
  verifyManifestEntrySignature,
  type RemoteManifestClaims,
  type TrustedRemotesRegistry,
} from './verify-manifest-signature';

/**
 * Reads runtime config directly off `window.__mfePotEnv` rather than
 * importing `@tn4consulting/shared-runtime-config`: main.tsx runs before
 * initFederation sets up the import-map/shared scope that bare-specifier
 * resolution depends on -- the same chicken-and-egg constraint documented
 * for native-federation itself in federation.config.mjs, and for
 * `shared-remote-registry` below. `getRuntimeConfig`'s merge-over-defaults
 * behavior is small enough to duplicate inline here; see CLAUDE.md's
 * Hosting section for the full runtime-config mechanism.
 *
 * The ambient `Window.__mfePotEnv` type here must match
 * `shared-runtime-config`'s own declaration exactly (`Record<string,
 * unknown> | undefined`) -- `apps/msca-shell/src/runtime-config.ts` (used by
 * the lazy-loaded LoginPage/AuthCallbackPage routes, which don't hit this
 * file's bare-specifier constraint) imports that package too, and
 * TypeScript requires identical types across merged ambient declarations
 * of the same global interface member once both are in the same program.
 */
declare global {
  interface Window {
    __mfePotEnv?: Record<string, unknown>;
  }
}

interface ShellRuntimeConfig {
  strapiBaseUrl: string | undefined;
  remotes: Record<string, string>;
  /**
   * Escape hatch for federation remote-loading integrity (see
   * mfe-pot/docs/plans/20260811-1500-federation-remote-loading-integrity.md):
   * `nx serve`'s dev server never signs anything (only the Docker build
   * does, via sign-remote-manifest), so strict Stage A/B verification
   * would make every remote permanently unloadable in local dev. Same
   * runtime-config mechanism as everything else here -- `devDefaults`
   * below sets this `true` for local dev; the Helm chart's `values.yaml`
   * sets it back to `false` explicitly for every real deployment (kind
   * and EKS alike), the same way it already pins every other field here
   * rather than relying on an absent key silently falling back to the dev
   * default. `true` only ever *warns* (console.warn) and still loads the
   * remote unverified -- it never blocks anything, since its whole
   * purpose is unblocking local dev, not a second enforcement mode.
   */
  allowUnverifiedRemotes: boolean;
}

const devDefaults: ShellRuntimeConfig = {
  strapiBaseUrl: 'http://localhost:1337',
  remotes: {
    'dashboard-mfe': 'http://localhost:4201/remoteEntry.json',
    'life-events-mfe': 'http://localhost:4202/remoteEntry.json',
    'job-bank-mfe': 'http://localhost:4203/remoteEntry.json',
    'employment-insurance-mfe': 'http://localhost:4204/remoteEntry.json',
  },
  allowUnverifiedRemotes: true,
};

const injected = window.__mfePotEnv as Partial<ShellRuntimeConfig> | undefined;
const runtimeConfig: ShellRuntimeConfig = { ...devDefaults, ...injected };

/**
 * Remote discovery goes through a RemoteRegistryProvider abstraction (see
 * `shared-remote-registry`, unit-tested there), not a static file read
 * directly. Locally, Strapi is the live directory server -- editing a
 * "Remote" entry there and reloading the shell picks up the change with no
 * rebuild. If Strapi is slow/unavailable (including: no Strapi in a
 * container/Kubernetes environment), fall back to `runtimeConfig.remotes`
 * -- itself either the dev defaults above or, in a container, the map
 * injected by the entrypoint script from the Helm chart's ConfigMap. This
 * replaces the old baked `federation.manifest.json`/`.prod.json` swap-file
 * pair with a single mechanism.
 *
 * This can't actually call into `shared-remote-registry` (a bare-specifier
 * workspace library) from here -- see the module-level comment above.
 * `shared-remote-registry`'s classes are the reusable, tested version used
 * everywhere else in the app (i.e. anything reached via the lazy
 * `./bootstrap` chain below, which loads *after* federation is initialized
 * and doesn't hit this constraint).
 */
interface StrapiRemoteAttributes {
  name: string;
  url: string;
}
interface StrapiListResponse {
  data: StrapiRemoteAttributes[];
}

async function fetchCandidateManifest(): Promise<Record<string, string>> {
  if (!runtimeConfig.strapiBaseUrl) {
    return runtimeConfig.remotes;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${runtimeConfig.strapiBaseUrl}/api/remotes`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Strapi returned ${response.status} for /api/remotes`);
    }
    const body = (await response.json()) as StrapiListResponse;
    return Object.fromEntries(body.data.map((entry) => [entry.name, entry.url]));
  } catch (err) {
    console.warn('Remote registry (Strapi) unavailable, falling back to configured remotes', err);
    return runtimeConfig.remotes;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Stage A of federation remote-loading integrity (see the design doc
 * linked above `trustedRemotes`'s import): for every candidate manifest
 * entry (Strapi's live directory, or the fallback config above), fetches
 * `remoteEntry.json` and its sibling `remoteEntry.json.sig`, verifies the
 * signature against `trustedRemotes`, and re-hashes the fetched bytes
 * against the now-trusted claims. Only entries that pass are admitted to
 * `initFederation()` -- an unverifiable remote is dropped (logged, not
 * thrown), the same degrade-quietly posture `RemoteErrorBoundary` already
 * uses elsewhere in this family, rather than a fatal error for the whole
 * shell.
 *
 * `verifiedManifests`/`remoteBaseUrls` are threaded down through
 * `bootstrap()` for Stage B (`App.tsx`'s `createVerifiedRemoteModuleLoader`)
 * to consume -- covers both `RemoteRouteHost`'s routed remotes AND
 * cross-remote widget loading (`routes.tsx`'s `WIDGET_REGISTRY`), since
 * both ultimately call through the one `loadRemoteModule` closure wrapped
 * in `App.tsx`.
 *
 * `runtimeConfig.allowUnverifiedRemotes` (`true` by dev default, `false`
 * in every real Helm-deployed environment) skips verification entirely
 * and admits every candidate as-is -- see `ShellRuntimeConfig`'s own doc
 * comment above.
 */
async function verifyAndAdmitManifest(candidates: Record<string, string>): Promise<{
  manifestUrls: Record<string, string>;
  verifiedManifests: Map<string, RemoteManifestClaims>;
  remoteBaseUrls: Map<string, string>;
}> {
  if (runtimeConfig.allowUnverifiedRemotes) {
    for (const remoteName of Object.keys(candidates)) {
      console.warn(
        `Remote "${remoteName}" admitted WITHOUT signature verification -- ` +
          'allowUnverifiedRemotes is set, which should only ever be true in local dev.',
      );
    }
    return { manifestUrls: candidates, verifiedManifests: new Map(), remoteBaseUrls: new Map() };
  }

  const registry = trustedRemotes as unknown as TrustedRemotesRegistry;
  const manifestUrls: Record<string, string> = {};
  const verifiedManifests = new Map<string, RemoteManifestClaims>();
  const remoteBaseUrls = new Map<string, string>();

  const results = await Promise.allSettled(
    Object.entries(candidates).map(async ([remoteName, manifestUrl]) => {
      const [manifestRes, sigRes] = await Promise.all([
        fetch(manifestUrl),
        fetch(new URL('remoteEntry.json.sig', manifestUrl)),
      ]);
      if (!manifestRes.ok || !sigRes.ok) {
        throw new Error(`fetch failed for manifest or signature (status ${manifestRes.status}/${sigRes.status})`);
      }
      const manifestBytes = await manifestRes.arrayBuffer();
      const compactJws = await sigRes.text();
      const verified = await verifyManifestEntrySignature(
        remoteName,
        manifestUrl,
        manifestBytes,
        compactJws,
        registry,
      );
      if (!verified) {
        throw new Error('signature verification failed');
      }
      return { remoteName, manifestUrl, claims: verified.claims };
    }),
  );

  results.forEach((result, index) => {
    const [remoteName] = Object.entries(candidates)[index];
    if (result.status === 'fulfilled') {
      manifestUrls[remoteName] = result.value.manifestUrl;
      remoteBaseUrls.set(remoteName, result.value.manifestUrl);
      verifiedManifests.set(remoteName, result.value.claims);
    } else {
      console.warn(
        `Remote "${remoteName}" failed integrity verification, dropping from federation manifest`,
        result.reason,
      );
    }
  });

  return { manifestUrls, verifiedManifests, remoteBaseUrls };
}

/**
 * `initFederation()`'s own default `setImportMapFn` writes a native
 * `<script type="importmap">` tag -- confirmed the hard way against a
 * real browser that this is the wrong choice here: a native import map
 * must exist before any module script starts loading and can never be
 * added afterward (the browser silently ignores a second one), which is
 * fundamentally incompatible with initFederation() being called from
 * *inside* an already-executing module (main.tsx itself) that hasn't
 * even decided what to dynamically import yet. `index.html`'s
 * `esms-options: { shimMode: true }` opts into es-module-shims' own
 * *shimmed* module loader specifically to get a runtime-updatable import
 * map -- but es-module-shims only watches `<script type="importmap-shim">`
 * tags for that, not the native type. Overriding `setImportMapFn` to
 * write that type instead is what actually connects the two; without
 * this override, `initFederation()` "succeeds" (the manifest fetch and
 * shared-dependency resolution all complete) but the resulting import
 * map is never actually applied anywhere es-module-shims will look,
 * so a later `import 'react'` for a real shared singleton fails with
 * "Unable to resolve specifier 'react'".
 */
function setShimImportMap(
  importMap: Record<string, unknown>,
  opts?: { override?: boolean },
): Promise<Record<string, unknown>> {
  if (opts?.override) {
    document.head.querySelectorAll('script[type="importmap-shim"]').forEach((el) => el.remove());
  }
  const script = document.createElement('script');
  script.type = 'importmap-shim';
  script.text = JSON.stringify(importMap);
  document.head.appendChild(script);
  return Promise.resolve(importMap);
}

/**
 * `initFederation()` resolves to a result object carrying `loadRemoteModule`
 * (plus a few other properties this app doesn't use) -- it doesn't just
 * set up federation as a side effect. `.as<Record<string, unknown>>()`
 * pins the generic that would otherwise default to `unknown`, matching
 * `RemoteModuleLoader`'s own signature in shared-federation-runtime
 * exactly. Passed down to `bootstrap()` explicitly (not read from a
 * module-level variable `./bootstrap` reaches into) so `RemoteModuleLoaderContext`
 * only ever gets a value that's actually finished initializing.
 */
/**
 * `hostRemoteEntry` -- confirmed the hard way this is required, not
 * optional, for a pure host with no `exposes`: the runtime import map
 * initFederation() builds is a *reconciliation* across every remote's own
 * declared shared deps, not an unconditional dump of this app's own
 * federation.config.mjs `shared` block. With every one of the four real
 * remotes unreachable in this local check (none running), the resulting
 * import map came back completely empty (`{"imports":{}}`) -- react and
 * react-dom never made it in at all, despite the build step producing
 * real chunk files and a real (unused) importmap.json for them on disk.
 * Registering the host's own `remoteEntry.json` (produced by that same
 * build step, served from this app's own origin) makes initFederation
 * treat this app as one more participant in that reconciliation, so its
 * own shared react/react-dom entries get pooled in regardless of whether
 * any other remote is reachable.
 */
fetchCandidateManifest()
  .then((candidates) => verifyAndAdmitManifest(candidates))
  .then(({ manifestUrls, verifiedManifests, remoteBaseUrls }) =>
    initFederation(manifestUrls, {
      hostRemoteEntry: 'remoteEntry.json',
      setImportMapFn: setShimImportMap,
    }).then((federationResult) => ({ federationResult, verifiedManifests, remoteBaseUrls })),
  )
  .then(({ federationResult, verifiedManifests, remoteBaseUrls }) => {
    const { loadRemoteModule } = federationResult.as<Record<string, unknown>>();
    return import('./bootstrap').then((m) =>
      m.bootstrap(loadRemoteModule, {
        verifiedManifests,
        remoteBaseUrls,
        allowUnverifiedRemotes: runtimeConfig.allowUnverifiedRemotes,
      }),
    );
  })
  .catch((err) => console.error(err));
