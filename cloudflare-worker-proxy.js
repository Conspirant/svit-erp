/**
 * Cloudflare Worker: Accredia ERP Raw TCP Proxy Gateway
 * Uses `cloudflare:sockets` to bypass Cloudflare edge port 8084 restrictions
 * 
 * Target: svit-students.accredia.in:8084
 */

import { connect } from 'cloudflare:sockets';

const TARGET_HOST = 'svit-students.accredia.in';
const TARGET_PORT = 8084;

/**
 * Decode standard HTTP/1.1 chunked transfer encoding from binary data
 */
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, HEAD',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Health check
    if (url.pathname === '/health' || url.pathname === '/ping') {
      return new Response(JSON.stringify({
        status: 'ok',
        target: `${TARGET_HOST}:${TARGET_PORT}`,
        socket: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // 3. Open raw TLS-secured TCP socket to port 8084
      const socket = connect(
        { hostname: TARGET_HOST, port: TARGET_PORT },
        { secureTransport: 'on', allowHalfOpen: false }
      );

      const writer = socket.writable.getWriter();

      // Read request body if present (POST/PUT)
      let bodyBytes = null;
      if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
        bodyBytes = await request.arrayBuffer();
      }

      // Construct HTTP request line and headers
      const pathWithQuery = `${url.pathname}${url.search}` || '/';
      let httpRequest = `${request.method} ${pathWithQuery} HTTP/1.1\r\n`;
      httpRequest += `Host: ${TARGET_HOST}:${TARGET_PORT}\r\n`;

      for (const [key, value] of request.headers.entries()) {
        const lower = key.toLowerCase();
        // Skip hop-by-hop and headers we will explicitly set
        if (
          !lower.startsWith('cf-') &&
          ![
            'host',
            'connection',
            'keep-alive',
            'content-length',
            'x-forwarded-proto',
            'x-forwarded-for',
            'x-real-ip',
            'accept-encoding'
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

      // Read all bytes from the socket
      const reader = socket.readable.getReader();
      const chunks = [];
      let totalLength = 0;

      let readerError = null;
      while (true) {
        try {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            totalLength += value.length;
          }
        } catch (readErr) {
          readerError = readErr.message;
          break;
        }
      }

      const allBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const c of chunks) {
        allBytes.set(c, offset);
        offset += c.length;
      }

      // Find header boundary \r\n\r\n
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
        return new Response(JSON.stringify({
          error: 'Invalid ERP HTTP response',
          receivedBytes: totalLength,
          chunksCount: chunks.length,
          readerError,
          previewText: new TextDecoder().decode(allBytes.subarray(0, 100)),
        }), { 
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
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
            responseHeaders.append(
              hKey,
              hVal.replace(`https://${TARGET_HOST}:${TARGET_PORT}`, url.origin)
            );
          } else if (hLower === 'set-cookie') {
            // Strip Secure flag so cookies work across localhost and custom origins
            const cleanCookie = hVal.replace(/;\s*Secure/gi, '');
            responseHeaders.append('Set-Cookie', cleanCookie);
          } else if (!['transfer-encoding', 'content-length', 'content-encoding'].includes(hLower)) {
            responseHeaders.append(hKey, hVal);
          }
        }
      }

      // If upstream sent chunked encoding, de-chunk it into raw binary
      if (isChunked) {
        rawBody = decodeChunked(rawBody);
      }

      responseHeaders.set('Content-Length', String(rawBody.length));
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      responseHeaders.set('Access-Control-Expose-Headers', 'Set-Cookie, Location');

      return new Response(rawBody, {
        status: statusCode,
        statusText: statusText,
        headers: responseHeaders,
      });

    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Cloudflare Socket Gateway Error',
          message: err.message,
          colo: request.headers.get('cf-ray') || 'unknown',
          target: `${TARGET_HOST}:${TARGET_PORT}`,
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
