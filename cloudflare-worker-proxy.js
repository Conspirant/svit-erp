/**
 * Cloudflare Worker: Accredia ERP Reverse Proxy Gateway
 * 
 * Target: https://svit-students.accredia.in:8084
 * 
 * Features:
 * - Transparently forwards requests to Accredia ERP on port 8084
 * - Preserves Cookies, Set-Cookie headers, and content types
 * - Handles both GET and POST requests
 * - Fixes CORS and redirect locations so sessions work seamlessly
 */

const TARGET_HOST = 'svit-students.accredia.in:8084';
const TARGET_ORIGIN = `https://${TARGET_HOST}`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Build the target destination URL on port 8084
    const targetUrl = new URL(url.pathname + url.search, TARGET_ORIGIN);

    // Clone incoming headers and rewrite host / referer
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', TARGET_HOST);
    newHeaders.set('Origin', TARGET_ORIGIN);

    const referer = request.headers.get('Referer');
    if (referer) {
      newHeaders.set('Referer', referer.replace(url.origin, TARGET_ORIGIN));
    }

    // Build request init options
    const init = {
      method: request.method,
      headers: newHeaders,
      redirect: 'manual', // Do not auto-follow redirects so session cookies are preserved
    };

    // Forward body if POST / PUT / PATCH
    if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
      init.body = await request.arrayBuffer();
    }

    try {
      const response = await fetch(targetUrl.toString(), init);

      // Clone response headers to modify redirect locations & set-cookie
      const responseHeaders = new Headers(response.headers);

      // Rewrite 301/302/303 Redirect locations back to this worker's origin
      const location = response.headers.get('Location');
      if (location) {
        if (location.startsWith(TARGET_ORIGIN)) {
          responseHeaders.set('Location', location.replace(TARGET_ORIGIN, url.origin));
        } else if (location.startsWith('/')) {
          responseHeaders.set('Location', `${url.origin}${location}`);
        }
      }

      // Add CORS headers for web client compatibility
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      responseHeaders.set('Access-Control-Allow-Headers', '*');

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: responseHeaders });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Gateway Error: ' + err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
