#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-rook-docs}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-octave-x-prod}"
DOCS_UPSTREAM_HOST="${DOCS_UPSTREAM_HOST:-chromaflow.mintlify.dev}"
CUSTOM_HOST="${CUSTOM_HOST:-www.chromaflow.ai}"
BASE_PATH="${BASE_PATH:-/docs}"
STRIP_BASE_PATH="${STRIP_BASE_PATH:-false}"

gcloud run deploy "${SERVICE_NAME}" \
  --source cloudrun-docs-proxy \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --set-env-vars "DOCS_UPSTREAM_HOST=${DOCS_UPSTREAM_HOST},CUSTOM_HOST=${CUSTOM_HOST},BASE_PATH=${BASE_PATH},STRIP_BASE_PATH=${STRIP_BASE_PATH}"
