# Cloud Run Docs Proxy

This service proxies a Mintlify deployment behind a custom domain or subpath.

## Environment variables

- `DOCS_UPSTREAM_HOST`: Mintlify upstream host, for example `rook.mintlify.app`
- `CUSTOM_HOST`: public hostname, for example `www.chromaflow.ai` or `rook.ai`
- `BASE_PATH`: external path prefix to proxy, for example `/docs` or `/`
- `UPSTREAM_BASE_PATH`: path prefix used by the upstream Mintlify site, for example `/docs`
- `STRIP_BASE_PATH`: set to `true` only if the upstream expects root paths instead of `/docs`

## Deploy

```bash
gcloud run deploy rook-docs \
  --source cloudrun-docs-proxy \
  --region us-central1 \
  --project octave-x-prod \
  --allow-unauthenticated \
  --set-env-vars DOCS_UPSTREAM_HOST=rook.mintlify.app,CUSTOM_HOST=rook.ai,BASE_PATH=/,UPSTREAM_BASE_PATH=/,STRIP_BASE_PATH=false
```

## Health check

```bash
curl https://YOUR_SERVICE_URL/healthz
```
