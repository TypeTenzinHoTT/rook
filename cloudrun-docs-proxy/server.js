import http from 'node:http';

const port = Number(process.env.PORT || 8080);
const docsUpstreamHost = process.env.DOCS_UPSTREAM_HOST || 'chromaflow.mintlify.dev';
const customHost = process.env.CUSTOM_HOST || 'www.chromaflow.ai';
const basePath = normalizeBasePath(process.env.BASE_PATH || '/docs');
const stripBasePath = /^(1|true|yes)$/i.test(process.env.STRIP_BASE_PATH || '');

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

function normalizeBasePath(value) {
  if (!value || value === '/') return '/';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function matchesBasePath(pathname) {
  if (basePath === '/') return true;
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function buildUpstreamPath(pathname, search) {
  if (basePath === '/' || !stripBasePath) {
    return `${pathname}${search}`;
  }

  if (pathname === basePath) {
    return `/${search.replace(/^\?/, '?')}`;
  }

  const stripped = pathname.slice(basePath.length) || '/';
  return `${stripped}${search}`;
}

function copyRequestHeaders(headers) {
  const copied = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    if (hopByHopHeaders.has(key.toLowerCase())) continue;

    if (Array.isArray(value)) {
      copied.set(key, value.join(', '));
    } else {
      copied.set(key, value);
    }
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

  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

function writeProxyResponse(res, upstreamResponse) {
  res.statusCode = upstreamResponse.status;

  upstreamResponse.headers.forEach((value, key) => {
    if (hopByHopHeaders.has(key.toLowerCase())) return;
    res.setHeader(key, value);
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

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (requestUrl.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        docsUpstreamHost,
        customHost,
        basePath,
        stripBasePath
      }));
      return;
    }

    if (!matchesBasePath(requestUrl.pathname)) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Path not handled by docs proxy',
        basePath
      }));
      return;
    }

    const upstreamUrl = new URL(`https://${docsUpstreamHost}`);
    upstreamUrl.pathname = buildUpstreamPath(requestUrl.pathname, requestUrl.search);
    upstreamUrl.search = '';

    const body = await readRequestBody(req);
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: copyRequestHeaders(req.headers),
      body
    });

    writeProxyResponse(res, upstreamResponse);
  } catch (error) {
    console.error('[docs-proxy] request failed', error);
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Proxy request failed'
    }));
  }
});

server.listen(port, () => {
  console.log(`[docs-proxy] listening on :${port}`);
  console.log(`[docs-proxy] upstream=${docsUpstreamHost} customHost=${customHost} basePath=${basePath} stripBasePath=${stripBasePath}`);
});
