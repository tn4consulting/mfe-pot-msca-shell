#!/usr/bin/env bash
# Builds shell's image, spins up (or reuses) a local kind cluster with
# ingress-nginx, and helm-upgrades this app's chart onto it -- the local
# equivalent of the kind-validation stage in .github/workflows/ci.yml.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

CLUSTER_NAME="${CLUSTER_NAME:-kind}"
PLATFORM_DIR=../mfe-pot-platform
HOSTNAME=shell.mfe-pot.local

if [ ! -d "$PLATFORM_DIR" ]; then
  echo "error: expected mfe-pot-platform checked out as a sibling at $PLATFORM_DIR (see ../mfe-pot.code-workspace)" >&2
  exit 1
fi

NPM_TOKEN="${NODE_AUTH_TOKEN:-${GITHUB_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
if [ -z "$NPM_TOKEN" ]; then
  echo "error: no GitHub token found. Set NODE_AUTH_TOKEN/GITHUB_TOKEN or run 'gh auth login' -- needed to pull @tn4consulting/* packages during the image build." >&2
  exit 1
fi
token_file="$(mktemp)"
trap 'rm -f "$token_file"' EXIT
printf '%s' "$NPM_TOKEN" > "$token_file"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "==> Creating kind cluster '$CLUSTER_NAME'..."
  kind create cluster --name "$CLUSTER_NAME" \
    --config "$PLATFORM_DIR/tools/k8s/kind-config.yaml" \
    --image kindest/node:v1.27.3
fi

if ! kubectl get ns ingress-nginx >/dev/null 2>&1; then
  echo "==> Installing ingress-nginx..."
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=120s
fi

export DOCKER_BUILDKIT=1

echo "==> Building shell image..."
docker build \
  --secret id=npm_token,src="$token_file" \
  -t mfe-pot-shell:kind \
  -f apps/shell/Dockerfile .

echo "==> Loading image into kind..."
kind load docker-image mfe-pot-shell:kind --name "$CLUSTER_NAME"

echo "==> Updating Helm chart dependencies..."
helm dependency update charts/shell

echo "==> Deploying shell..."
helm upgrade --install shell charts/shell \
  -f charts/shell/values.yaml \
  -f charts/shell/values-kind.yaml \
  --wait --timeout 120s

echo "==> Waiting for ingress..."
status=000
for i in $(seq 1 30); do
  status=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $HOSTNAME" http://localhost/ || echo 000)
  [ "$status" = "200" ] && break
  sleep 2
done
if [ "$status" != "200" ]; then
  echo "warning: shell isn't answering with 200 yet (last status: $status). Check with:" >&2
  echo "  kubectl get pods,ingress" >&2
  exit 1
fi

echo "==> shell is up: curl -H \"Host: $HOSTNAME\" http://localhost/"
