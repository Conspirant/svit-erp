/**
 * Cloudflare Worker: Accredia ERP Reverse Proxy Gateway
 * 
 * Uses Cloudflare's native fetch() API (which supports non-standard ports)
 * to proxy requests to the ERP backend at svit-students.accredia.in:8084.
 * 
 * Falls back to cloudflare:sockets raw TCP if fetch fails with network error.
 * 
 * Target: https://svit-students.accredia.in:8084
 */

import { connect } from 'cloudflare:sockets';

const TARGET_HOST = 'svit-students.accredia.in';
const TARGET_PORT = 8084;
const TARGET_ORIGIN = `https://${TARGET_HOST}:${TARGET_PORT}`;

// ─── Chunked Transfer Decoding (for raw socket fallback) ────────────────────
function decodeChunked(buffer) {
  let offset = 0;
  const chunks = [];
  const len = buffer.length;

  while (offset < len) {
    let crlf = -1;
    for (let i = offset; i < len - 1; i++) {
      if (buffer[i] === 0x0D && buffer[i + 1] === 0x0A) {
        crlf = i;
        break;
      }
    }
    if (crlf === -1) break;

    const sizeStr = new TextDecoder().decode(buffer.subarray(offset, crlf)).trim().split(';')[0];
    const chunkSize = parseInt(sizeStr, 16);
    if (isNaN(chunkSize) || chunkSize === 0) break;

    const chunkStart = crlf + 2;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > len) {
      chunks.push(buffer.subarray(chunkStart));
      break;
    }

    chunks.push(buffer.subarray(chunkStart, chunkEnd));
    offset = chunkEnd + 2;
  }

  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

// ─── CORS helper headers ────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, HEAD',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Set-Cookie, Location',
};

// ─── Rewrite Set-Cookie domain/Secure flags for cross-origin usage ──────────
function rewriteSetCookieHeaders(originalHeaders, outHeaders) {
  const cookies = originalHeaders.getAll
    ? originalHeaders.getAll('set-cookie')
    : [originalHeaders.get('set-cookie')].filter(Boolean);

  for (const cookie of cookies) {
    // Some servers return multiple cookies delimited by comma + space
    // but Set-Cookie can have dates with commas so we just strip flags
    const cleaned = cookie
      .replace(/;\s*Secure/gi, '')
      .replace(/;\s*SameSite=\w+/gi, '; SameSite=None');
    outHeaders.append('Set-Cookie', cleaned);
  }
}

// ─── Rewrite Location header ────────────────────────────────────────────────
function rewriteLocation(locationValue, workerOrigin) {
  if (!locationValue) return locationValue;
  return locationValue.replace(
    new RegExp(`https?://${TARGET_HOST}:${TARGET_PORT}`, 'gi'),
    workerOrigin
  );
}

// ─── Primary: Use Cloudflare fetch() ────────────────────────────────────────
async function proxyViaFetch(request, url) {
  const targetUrl = `${TARGET_ORIGIN}${url.pathname}${url.search}`;

  // Build headers - forward most but override Host
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      !lower.startsWith('cf-') &&
      lower !== 'host' &&
      lower !== 'x-forwarded-for' &&
      lower !== 'x-forwarded-proto' &&
      lower !== 'x-real-ip'
    ) {
      headers.set(key, value);
    }
  }
  headers.set('Host', `${TARGET_HOST}:${TARGET_PORT}`);
  headers.set('Accept-Encoding', 'identity'); // avoid compressed responses we can't relay

  const fetchInit = {
    method: request.method,
    headers: headers,
    redirect: 'manual', // Don't follow redirects, pass them through
  };

  // Forward body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase()) && request.body) {
    fetchInit.body = request.body;
    fetchInit.duplex = 'half'; // Required for streaming bodies
  }

  const erpResponse = await fetch(targetUrl, fetchInit);

  // Build response headers with CORS and cookie rewriting
  const responseHeaders = new Headers();
  for (const [key, value] of erpResponse.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') {
      // handled below
    } else if (lower === 'location') {
      responseHeaders.set(key, rewriteLocation(value, url.origin));
    } else {
      responseHeaders.set(key, value);
    }
  }

  // Rewrite cookies
  rewriteSetCookieHeaders(erpResponse.headers, responseHeaders);

  // Add CORS headers
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    responseHeaders.set(key, value);
  }

  return new Response(erpResponse.body, {
    status: erpResponse.status,
    statusText: erpResponse.statusText,
    headers: responseHeaders,
  });
}

// ─── Fallback: Raw TCP Socket ───────────────────────────────────────────────
async function proxyViaSocket(request, url) {
  const socket = connect(
    { hostname: TARGET_HOST, port: TARGET_PORT },
    { secureTransport: 'on', allowHalfOpen: false }
  );

  const writer = socket.writable.getWriter();

  let bodyBytes = null;
  if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
    bodyBytes = await request.arrayBuffer();
  }

  const pathWithQuery = `${url.pathname}${url.search}` || '/';
  let httpRequest = `${request.method} ${pathWithQuery} HTTP/1.1\r\n`;
  httpRequest += `Host: ${TARGET_HOST}:${TARGET_PORT}\r\n`;

  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      !lower.startsWith('cf-') &&
      ![
        'host', 'connection', 'keep-alive', 'content-length',
        'x-forwarded-proto', 'x-forwarded-for', 'x-real-ip',
        'accept-encoding',
      ].includes(lower)
    ) {
      httpRequest += `${key}: ${value}\r\n`;
    }
  }

  if (bodyBytes !== null) {
    httpRequest += `Content-Length: ${bodyBytes.byteLength}\r\n`;
  }

  httpRequest += `Accept-Encoding: identity\r\n`;
  httpRequest += `Connection: close\r\n\r\n`;

  const encoder = new TextEncoder();
  await writer.write(encoder.encode(httpRequest));

  if (bodyBytes !== null && bodyBytes.byteLength > 0) {
    await writer.write(new Uint8Array(bodyBytes));
  }

  writer.releaseLock();

  // Read all response bytes
  const reader = socket.readable.getReader();
  const chunks = [];
  let totalLength = 0;

  while (true) {
    try {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.length;
      }
    } catch (readErr) {
      // Socket closed by remote (Connection: close) — expected
      break;
    }
  }

  const allBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    allBytes.set(c, offset);
    offset += c.length;
  }

  // Find header/body boundary \r\n\r\n
  let headerBoundary = -1;
  for (let i = 0; i < allBytes.length - 3; i++) {
    if (
      allBytes[i] === 0x0D &&
      allBytes[i + 1] === 0x0A &&
      allBytes[i + 2] === 0x0D &&
      allBytes[i + 3] === 0x0A
    ) {
      headerBoundary = i;
      break;
    }
  }

  if (headerBoundary === -1) {
    throw new Error(`Socket fallback: no HTTP header boundary found (${totalLength} bytes received)`);
  }

  const rawHeaders = new TextDecoder().decode(allBytes.subarray(0, headerBoundary));
  let rawBody = allBytes.subarray(headerBoundary + 4);

  const headerLines = rawHeaders.split('\r\n');
  const statusLine = headerLines[0] || '';
  const statusCode = parseInt(statusLine.split(' ')[1], 10) || 200;
  const statusText = statusLine.split(' ').slice(2).join(' ') || 'OK';

  let isChunked = false;
  const responseHeaders = new Headers();
  for (let i = 1; i < headerLines.length; i++) {
    const line = headerLines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const hKey = line.substring(0, colonIdx).trim();
      const hVal = line.substring(colonIdx + 1).trim();
      const hLower = hKey.toLowerCase();

      if (hLower === 'transfer-encoding' && hVal.toLowerCase().includes('chunked')) {
        isChunked = true;
      } else if (hLower === 'location') {
        responseHeaders.append(hKey, rewriteLocation(hVal, url.origin));
      } else if (hLower === 'set-cookie') {
        const cleanCookie = hVal.replace(/;\s*Secure/gi, '');
        responseHeaders.append('Set-Cookie', cleanCookie);
      } else if (!['transfer-encoding', 'content-length', 'content-encoding'].includes(hLower)) {
        responseHeaders.append(hKey, hVal);
      }
    }
  }

  if (isChunked) {
    rawBody = decodeChunked(rawBody);
  }

  responseHeaders.set('Content-Length', String(rawBody.length));
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    responseHeaders.set(key, value);
  }

  return new Response(rawBody, {
    status: statusCode,
    statusText: statusText,
    headers: responseHeaders,
  });
}

// ─── Main Handler ───────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Health check
    if (url.pathname === '/health' || url.pathname === '/ping') {
      return new Response(JSON.stringify({
        status: 'ok',
        target: `${TARGET_HOST}:${TARGET_PORT}`,
        mode: 'fetch-first',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // 3. Try native fetch() first, fall back to raw TCP socket
    try {
      return await proxyViaFetch(request, url);
    } catch (fetchErr) {
      // fetch() may fail on some Cloudflare edge nodes for port 8084
      // Fall back to raw TCP socket proxy
      try {
        return await proxyViaSocket(request, url);
      } catch (socketErr) {
        return new Response(
          JSON.stringify({
            error: 'ERP Gateway Error',
            fetchError: fetchErr.message,
            socketError: socketErr.message,
            target: `${TARGET_HOST}:${TARGET_PORT}`,
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              ...CORS_HEADERS,
            },
          }
        );
      }
    }
  },
};
