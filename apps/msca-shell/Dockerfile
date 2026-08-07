# syntax=docker/dockerfile:1
#
# Built from this repo's own root, post Phase 1 extraction (see the
# platform repo's docs/plans/20260801-1935-mfe-pot-polyrepo-split-and-k8s-hosting.md).
# Same shape as apps/job-bank/Dockerfile in the sibling mfe-pot-job-bank
# repo, which this was copied from -- see its comments for the fuller
# story on the fixes below. Shell has no co-located BFF (it's a pure
# federation host), so unlike the other extracted apps this repo only
# has one Dockerfile.
#
# One image, built once, promoted across environments unchanged -- see
# CLAUDE.md's Hosting section. Environment-specific values (including the
# `remotes` map -- which app URLs to federate in) are injected at
# container startup via MFE_POT_ENV_JSON (see tools/docker/frontend-entrypoint.sh),
# never baked in at build time.

FROM node:22-alpine AS build
WORKDIR /workspace
# CI=true kept for consistency; the real fix for nx's postinstall hang is
# removing "nx" from pnpm.onlyBuiltDependencies below -- see the sibling
# mfe-pot-job-bank repo's apps/job-bank/Dockerfile top comment.
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json tsconfig.json .npmrc ./
COPY apps ./apps
COPY tools ./tools
RUN --mount=type=secret,id=npm_token \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token)" pnpm install --frozen-lockfile --network-concurrency=4
RUN pnpm exec nx build shell --configuration=production

FROM nginx:alpine AS runtime
COPY tools/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY tools/docker/frontend-entrypoint.sh /docker-entrypoint.d/40-mfe-pot-env.sh
RUN chmod +x /docker-entrypoint.d/40-mfe-pot-env.sh
COPY --from=build /workspace/dist/apps/shell/browser /usr/share/nginx/html
EXPOSE 80
