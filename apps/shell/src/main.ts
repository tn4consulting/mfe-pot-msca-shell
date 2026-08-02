import { initFederation } from '@angular-architects/native-federation';

/**
 * Reads runtime config directly off `window.__mfePotEnv` rather than
 * importing `@tn4consulting/shared-runtime-config`: main.ts runs before
 * initFederation sets up the import-map/shared scope that bare-specifier
 * resolution depends on -- the same chicken-and-egg constraint documented
 * for native-federation itself in federation.config.mjs, and for
 * `shared-remote-registry` below. `getRuntimeConfig`'s merge-over-defaults
 * behavior is small enough to duplicate inline here; see CLAUDE.md's
 * Hosting section for the full runtime-config mechanism.
 */
declare global {
  interface Window {
    __mfePotEnv?: {
      strapiBaseUrl?: string;
      remotes?: Record<string, string>;
    };
  }
}

const devDefaults = {
  strapiBaseUrl: 'http://localhost:1337',
  remotes: {
    dashboard: 'http://localhost:4201/remoteEntry.json',
    'employment-life-events': 'http://localhost:4202/remoteEntry.json',
    'job-bank': 'http://localhost:4203/remoteEntry.json',
    'employment-insurance': 'http://localhost:4204/remoteEntry.json',
  },
};

const runtimeConfig = { ...devDefaults, ...window.__mfePotEnv };

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

async function resolveFederationManifest(): Promise<Record<string, string>> {
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

resolveFederationManifest()
  .then((manifest) => initFederation(manifest))
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
