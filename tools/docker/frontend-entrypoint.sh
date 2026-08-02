#!/bin/sh
# Runs automatically at container start (dropped into nginx's
# /docker-entrypoint.d/, which the official nginx image executes before
# starting nginx itself -- no custom ENTRYPOINT/CMD needed). Writes
# whatever the Helm chart's ConfigMap injected as MFE_POT_ENV_JSON over
# the placeholder env.js baked into the image, so the app reads real
# config via window.__mfePotEnv on next request. See CLAUDE.md's Hosting
# section and libs/shared/runtime-config.
set -eu

if [ -z "${MFE_POT_ENV_JSON:-}" ]; then
  MFE_POT_ENV_JSON='{}'
fi

echo "window.__mfePotEnv = ${MFE_POT_ENV_JSON};" > /usr/share/nginx/html/env.js
