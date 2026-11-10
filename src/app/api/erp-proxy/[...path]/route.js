import { NextResponse } from 'next/server';
import axios from 'axios';
import { createHttpsAgent, DEFAULT_USER_AGENT } from '@/lib/erpConfig';

const httpsAgent = createHttpsAgent();
const DIRECT_TARGET = 'https://svit-students.accredia.in:8084';

export const dynamic = 'force-dynamic';

async function handleProxy(request, context) {
  const { params } = context;
  const pathParts = (await params)?.path || [];
  const targetPath = '/' + pathParts.join('/');
  const searchParams = new URL(request.url).search;
  const targetUrl = `${DIRECT_TARGET}${targetPath}${searchParams}`;

  const incomingHeaders = {};
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (!['host', 'connection', 'content-length'].includes(lower)) {
      incomingHeaders[key] = value;
    }
  }
  incomingHeaders['User-Agent'] = DEFAULT_USER_AGENT;
  incomingHeaders['Host'] = 'svit-students.accredia.in:8084';

  let body = null;
  if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
    body = await request.arrayBuffer();
  }

  try {
    const response = await axios({
      method: request.method,
      url: targetUrl,
      httpsAgent,
      headers: incomingHeaders,
      data: body,
      responseType: 'arraybuffer',
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 15000,
    });

    const outgoingHeaders = new Headers();
    for (const [key, value] of Object.entries(response.headers)) {
      const lower = key.toLowerCase();
      if (lower === 'set-cookie') {
        const cookies = Array.isArray(value) ? value : [value];
        for (const cookie of cookies) {
          outgoingHeaders.append('Set-Cookie', cookie.replace(/;\s*Secure/gi, ''));
        }
      } else if (!['transfer-encoding', 'content-encoding', 'connection'].includes(lower)) {
        outgoingHeaders.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      }
    }

    outgoingHeaders.set('Access-Control-Allow-Origin', '*');
    outgoingHeaders.set('Access-Control-Allow-Credentials', 'true');
    outgoingHeaders.set('X-Egress-Gateway', 'vercel-edge');

    return new NextResponse(response.data, {
      status: response.status,
      statusText: response.statusText,
      headers: outgoingHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'ERP Proxy Gateway Error', message: err.message },
      { status: 502 }
    );
  }
}

export async function GET(request, context) {
  return handleProxy(request, context);
}

export async function POST(request, context) {
  return handleProxy(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

