#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-rook-docs}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-octave-x-prod}"
DOCS_UPSTREAM_HOST="${DOCS_UPSTREAM_HOST:-rook.mintlify.app}"
CUSTOM_HOST="${CUSTOM_HOST:-rook.ai}"
DOCS_BASE_PATH="${DOCS_BASE_PATH:-/docs}"
UPSTREAM_BASE_PATH="${UPSTREAM_BASE_PATH:-/}"
STRIP_DOCS_BASE_PATH="${STRIP_DOCS_BASE_PATH:-true}"

gcloud run deploy "${SERVICE_NAME}" \
  --source cloudrun-docs-proxy \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --set-env-vars "DOCS_UPSTREAM_HOST=${DOCS_UPSTREAM_HOST},CUSTOM_HOST=${CUSTOM_HOST},DOCS_BASE_PATH=${DOCS_BASE_PATH},UPSTREAM_BASE_PATH=${UPSTREAM_BASE_PATH},STRIP_DOCS_BASE_PATH=${STRIP_DOCS_BASE_PATH}"
