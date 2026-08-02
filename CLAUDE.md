# mfe-pot-shell

## What this is

The **host app** for the mfe-pot Government of Canada MFE proof-of-technology: the branded MSCA ("My Service Canada Account") app frame — GC header/footer, language switcher, mock Sign-In-Canada-style login, runtime federation manifest reader. It loads `mfe-pot-job-bank`, `mfe-pot-employment-insurance`, `mfe-pot-dashboard`, and `mfe-pot-employment-life-events` dynamically at runtime as federated remotes; none of their source is compiled in here.

**This repo doesn't carry its own architecture doc.** Full rationale — bilingual/WCAG/GCDS requirements, the Native Federation setup, why apps are thin and libs hold the logic, the federation-sharing policy, security model, i18n mechanism, hosting/Helm pattern, and every non-obvious gotcha behind the code in this repo — lives in **`../mfe-pot-platform/CLAUDE.md`**. Read it before making any architectural change here; this file only covers what's specific to this repo. See `../CLAUDE.md` (the `mfe-pot` meta repo) for the full 6-repo map.

## What's in this repo

- `apps/shell` — the only app; no co-located BFF (a pure federation host). No `libs/` — shell has no feature code of its own beyond the app frame and login page.
- `charts/shell` — this app's Helm chart, depending only on the platform repo's `mfe-frontend-lib` library chart (no backend, so `mfe-backend-lib` isn't used) plus a hand-written `templates/ingress.yaml`.
- `apps/shell/Dockerfile` — nginx-served static build; see the platform repo's CLAUDE.md ("Hosting: Kubernetes + Helm") for the shape and the Docker-build gotchas (npm auth secret mount, the `nx` postinstall hang fix) that apply here too.

Depends on published packages from GitHub Packages: `@tn4consulting/shared-auth`, `shared-federation-config`, `shared-federation-runtime`, `shared-i18n`, `shared-ui-gcds` (pinned in `package.json`; keep in sync with `platform-versions.json` in `mfe-pot-platform`). No `shared-runtime-config` or `shared-content-client` — shell doesn't use `ContentClient`, and can't use `shared-runtime-config` anyway (see below).

## Repo-specific things worth knowing

- **`apps/shell/src/main.ts` cannot import any `@tn4consulting/shared-*` package**, including ones this repo otherwise depends on (`shared-remote-registry` isn't even a dependency here for this reason) — `main.ts` runs before Native Federation's import-map/shared scope exists, and any bare-specifier import from it resolves through that not-yet-ready map. `main.ts` inlines its own small `{ ...devDefaults, ...window.__mfePotEnv }` runtime-config merge and its own Strapi-first-with-fallback federation-manifest resolution instead of using `shared-remote-registry`/`shared-runtime-config` directly. See the platform repo's CLAUDE.md for the full explanation (same root cause documented there for every app).
- **Runtime config shape here is `{ strapiBaseUrl, remotes }`** — `remotes` is a `Record<name, remoteEntryUrl>`, the federation directory. `resolveFederationManifest()` tries Strapi first (3s timeout), falling back to `runtimeConfig.remotes` — this replaced the old baked `federation.manifest.json`/`.prod.json` swap-file pair entirely.
- **This is the one app repo where GCDS federation-sharing actually matters at the point of definition**: `MscaAppFrame` (from `shared-ui-gcds`) is used only here — remotes render content only, never their own header/footer (per the platform repo's GCDS section). `@gcds-core/components`/`components-angular` must stay federation-shared singletons in `federation.config.mjs` (via `shared-federation-config`), or two bundles defining the Angular wrapper classes on the same page trip `NG0912`.
- **`shared-ui-gcds` is pinned at `^0.1.3`** specifically to pick up a fix for a runtime "JIT compiler unavailable" error — don't downgrade it without checking why that fix was needed (see `mfe-pot-platform`'s publish history for `shared-ui-gcds`).
- No `.github/workflows/` and no `README.md` yet — this repo hasn't had its kind-based CI validation stage wired in, and per-app-repo READMEs are still open work tracked in the platform repo's plan doc.

## Renovate

`renovate.json` extends `github>tn4consulting/mfe-pot-platform` — the shared preset (groups `@angular/*`, `@schematics/angular`, `listr2` into one coordinated pinned bump). Don't hand-roll Angular version bumps here independently of the other 5 repos; `platform-versions.json` in `mfe-pot-platform` is the source of truth for what version they should all be on.
