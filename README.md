# mfe-pot-shell

> **Disclaimer:** This is an independent proof-of-technology project, not
> affiliated with, endorsed by, or associated with Service Canada,
> Employment and Social Development Canada (ESDC), or the Government of
> Canada in any way. "MSCA" and any GC branding/design-system references are
> used only to ground the proof of technology in a realistic scenario.

The host app for the mfe-pot Government of Canada MFE proof-of-technology —
branded MSCA app frame (GC header/footer, language switcher, mock sign-in)
that loads the other 4 apps dynamically at runtime as federated remotes.

This README covers running **this app standalone**. For the full family
(all 6 repos together) and architecture rationale, see
[`../mfe-pot-platform/README.md`](../mfe-pot-platform/README.md) and
[`CLAUDE.md`](./CLAUDE.md) in this repo.

## Prerequisites

- **asdf** with the `nodejs` plugin (`.tool-versions` pins the exact
  version — currently 22.22.0, anything ≥ 22.12 works).
- **pnpm** (not asdf-managed — install globally or via `corepack enable`).
- **A GitHub personal access token with `read:packages` scope**, exported as
  `NODE_AUTH_TOKEN` — `pnpm install` pulls `@tn4consulting/shared-*` packages
  from GitHub Packages (`.npmrc` in this repo points at that registry). `gh
  auth token` works as a substitute if you have `gh` authenticated.
- **Docker**, **kind**, **helm**, **kubectl** — only for the containerized
  loop below.

## Install & run standalone

```bash
export NODE_AUTH_TOKEN=<your GitHub token>
pnpm install
pnpm exec nx serve shell
```

Open `http://localhost:4200`. Running alone, the shell has no other apps to
federate in — its own login page and app frame render, and it falls back to
static federation-manifest config if Strapi isn't reachable (see the
platform repo's README for running Strapi and the other 4 apps alongside
this one for the full experience).

## Test, lint, build

```bash
pnpm exec nx test shell
pnpm exec nx lint shell
pnpm exec nx build shell --configuration=production
```

Or all three across this repo's projects: `pnpm run test` / `pnpm run lint`
/ `pnpm run build`.

## Build & run the Docker image standalone

```bash
docker build --secret id=npm_token,src=<(printf '%s' "$NODE_AUTH_TOKEN") \
  -t mfe-pot-shell:local -f apps/shell/Dockerfile .
docker run -p 8080:80 mfe-pot-shell:local
```

Serves the production build on nginx at `http://localhost:8080` with
`window.__mfePotEnv = {}` (the image's placeholder runtime config).

## Deploy this app's Helm chart locally (kind)

```bash
pnpm deploy:local
```

Runs `tools/deploy-local.sh`: builds the image, creates/reuses a local
`kind` cluster (shared with the other app repos, named `kind`), and
`helm upgrade --install`s `charts/shell`. Requires `../mfe-pot-platform`
checked out as a sibling (this chart's library-chart dependency resolves via
a `file://../../../mfe-pot-platform/charts/...` relative path). Add to
`/etc/hosts`:

```
127.0.0.1 shell.mfe-pot.local
```

Then `curl -H "Host: shell.mfe-pot.local" http://localhost/` or browse there
directly.

## Where to go next

- [`CLAUDE.md`](./CLAUDE.md) — this repo's specific gotchas (why `main.ts`
  can't import shared packages, GCDS federation-sharing, Renovate).
- [`../mfe-pot-platform/CLAUDE.md`](../mfe-pot-platform/CLAUDE.md) — the
  full architecture reference for the whole family.
- [`../mfe-pot-platform/README.md`](../mfe-pot-platform/README.md) —
  running all 6 repos together.
