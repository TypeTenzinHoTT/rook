import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const port = Number(process.env.PORT || 8080);
const docsUpstreamHost = process.env.DOCS_UPSTREAM_HOST || 'rook.mintlify.app';
const customHost = process.env.CUSTOM_HOST || 'rook.ai';
const docsBasePath = normalizeBasePath(process.env.DOCS_BASE_PATH || '/docs');
const upstreamBasePath = normalizeBasePath(process.env.UPSTREAM_BASE_PATH || '/');
const stripDocsBasePath = /^(1|true|yes)$/i.test(process.env.STRIP_DOCS_BASE_PATH || '');

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length'
]);

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8']
]);

function normalizeBasePath(value) {
  if (!value || value === '/') return '/';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function matchesDocsBasePath(pathname) {
  if (docsBasePath === '/') return true;
  return pathname === docsBasePath || pathname.startsWith(`${docsBasePath}/`);
}

function buildUpstreamPath(pathname) {
  let effectivePath = pathname;

  if (docsBasePath === '/') {
    effectivePath = pathname;
  } else if (stripDocsBasePath) {
    effectivePath = pathname === docsBasePath ? '/' : pathname.slice(docsBasePath.length) || '/';
  }

  let upstreamPathname;
  if (upstreamBasePath === '/') {
    upstreamPathname = effectivePath;
  } else if (effectivePath === '/') {
    upstreamPathname = upstreamBasePath;
  } else {
    upstreamPathname = `${upstreamBasePath}${effectivePath}`;
  }

  return upstreamPathname;
}

function copyRequestHeaders(headers) {
  const copied = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    if (hopByHopHeaders.has(key.toLowerCase())) continue;

    copied.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  copied.set('Host', docsUpstreamHost);
  copied.set('X-Forwarded-Host', customHost);
  copied.set('X-Forwarded-Proto', 'https');

  return copied;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function writeProxyResponse(res, upstreamResponse) {
  res.statusCode = upstreamResponse.status;

  upstreamResponse.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  if (!upstreamResponse.body) {
    res.end();
    return;
  }

  upstreamResponse.body.pipeTo(
    new WritableStream({
      write(chunk) {
        res.write(Buffer.from(chunk));
      },
      close() {
        res.end();
      },
      abort(err) {
        res.destroy(err);
      }
    })
  ).catch((err) => {
    res.destroy(err);
  });
}

async function proxyDocs(req, res, requestUrl) {
  const upstreamUrl = new URL(`https://${docsUpstreamHost}`);
  upstreamUrl.pathname = buildUpstreamPath(requestUrl.pathname);
  upstreamUrl.search = requestUrl.search;

  const body = await readRequestBody(req);
  const upstreamResponse = await fetch(upstreamUrl, {
    method: req.method,
    headers: copyRequestHeaders(req.headers),
    body
  });

  writeProxyResponse(res, upstreamResponse);
}

function publicFilePath(pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const resolvedPath = path.normalize(path.join(publicDir, safePath));
  if (!resolvedPath.startsWith(publicDir)) return null;
  return resolvedPath;
}

async function serveStatic(res, pathname) {
  const filePath = publicFilePath(pathname);
  if (!filePath) return false;

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return false;

    const ext = path.extname(filePath);
    const contentType = mimeTypes.get(ext) || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    res.writeHead(200, {
      'content-type': contentType,
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (requestUrl.pathname === '/healthz') {
      json(res, 200, {
        ok: true,
        docsUpstreamHost,
        customHost,
        docsBasePath,
        upstreamBasePath,
        stripDocsBasePath
      });
      return;
    }

    if (matchesDocsBasePath(requestUrl.pathname)) {
      await proxyDocs(req, res, requestUrl);
      return;
    }

    const served = await serveStatic(res, requestUrl.pathname);
    if (served) return;

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[rook-web] request failed', error);
    json(res, 502, { error: 'Request failed' });
  }
});

server.listen(port, () => {
  console.log(`[rook-web] listening on :${port}`);
  console.log(
    `[rook-web] docsUpstream=${docsUpstreamHost} customHost=${customHost} docsBasePath=${docsBasePath} upstreamBasePath=${upstreamBasePath} stripDocsBasePath=${stripDocsBasePath}`
  );
});
