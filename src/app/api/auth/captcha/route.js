import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  ERP_BASE_URL,
  ERP_CAPTCHA_URL,
  DEFAULT_USER_AGENT,
  createHttpsAgent,
  egressManager,
} from '@/lib/erpConfig';

const httpsAgent = createHttpsAgent();

const DIRECT_ORIGIN = 'https://svit-students.accredia.in:8084';
const DEFAULT_GATEWAY = 'https://svit-erp-gateway.creepmodder185.workers.dev';

async function fetchWithRetry(fn, retries = 2, baseDelayMs = 500) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fn();
      if (res && res.status >= 500) {
        throw new Error(`Upstream returned status ${res.status}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(1.5, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastErr;
}

async function tryFetchCaptcha(baseOrigin) {
  const commonHeaders = {
    'User-Agent': DEFAULT_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'close',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  };

  const loginUrl = `${baseOrigin}/parents/index.php`;
  const captchaUrl = `${baseOrigin}/parents/templates/contineoReg/captcha/get_captcha.php`;

  const connectTimeout = process.env.NODE_ENV !== 'production' && baseOrigin.includes(':8084') ? 3500 : 8000;

  // 1. Fetch login page for session cookie & CSRF tokens
  const initialRes = await fetchWithRetry(() =>
    axios.get(loginUrl, {
      httpsAgent,
      timeout: connectTimeout,
      headers: commonHeaders,
      validateStatus: () => true,
    })
  );

  const cookiesArray = initialRes.headers['set-cookie'];
  let sessionCookie = cookiesArray ? cookiesArray.map((c) => c.split(';')[0]).join('; ') : '';

  const $ = cheerio.load(initialRes.data);
  const formContainer = $('form')
    .filter((i, el) => $(el).attr('id') === 'login-form' || $(el).find('input[name="username"]').length > 0)
    .last();

  const returnToken = formContainer.find('input[name="return"]').first().val() || '';

  let csrfTokenName = '';
  formContainer.find('input[type="hidden"][value="1"]').each((_, el) => {
    const name = $(el).attr('name');
    if (name && name.length === 32) {
      csrfTokenName = name;
    }
  });

  if (!csrfTokenName) {
    $('input[type="hidden"][value="1"]').each((_, el) => {
      const name = $(el).attr('name');
      if (name && name.length === 32) csrfTokenName = name;
    });
  }

  // 2. Fetch CAPTCHA image
  const captchaRes = await fetchWithRetry(() =>
    axios.get(`${captchaUrl}?rand=${Date.now()}`, {
      httpsAgent,
      timeout: 8000,
      responseType: 'arraybuffer',
      validateStatus: () => true,
      headers: {
        ...commonHeaders,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin',
        'Cookie': sessionCookie,
        'Referer': loginUrl,
      },
    })
  );

  if (captchaRes.headers['set-cookie']) {
    const moreCookies = captchaRes.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
    sessionCookie = sessionCookie ? `${sessionCookie}; ${moreCookies}` : moreCookies;
  }

  const base64Image = Buffer.from(captchaRes.data).toString('base64');
  return {
    captchaDataUrl: `data:image/jpeg;base64,${base64Image}`,
    sessionCookie,
    csrfTokenName,
    returnToken,
  };
}

export async function GET() {
  const allNodes = egressManager.getAllNodes();
  const healthyNodes = allNodes.filter(n => n.healthy).map(n => n.url);
  const candidateOrigins = healthyNodes.length > 0 ? healthyNodes : allNodes.map(n => n.url);
  if (!candidateOrigins.includes(DIRECT_ORIGIN)) {
    candidateOrigins.push(DIRECT_ORIGIN);
  }

  let lastError = null;

  for (const origin of candidateOrigins) {
    const startTime = Date.now();
    try {
      const result = await tryFetchCaptcha(origin);
      egressManager.reportOutcome(origin, 200, Date.now() - startTime);

      const sessionData = JSON.stringify({
        sessionCookie: result.sessionCookie,
        csrfTokenName: result.csrfTokenName,
        returnToken: result.returnToken,
        activeOrigin: origin,
        timestamp: Date.now(),
      });

      const response = NextResponse.json({
        success: true,
        captchaImage: result.captchaDataUrl,
      });

      response.cookies.set({
        name: 'erp_login_session',
        value: Buffer.from(sessionData).toString('base64'),
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 15 * 60, // 15 minutes
      });

      return response;
    } catch (err) {
      lastError = err;
      const status = err.response?.status || 502;
      egressManager.reportOutcome(origin, status, Date.now() - startTime);
      console.warn(`[captcha] Origin ${origin} failed: ${err.message}, trying next origin...`);
    }
  }

  console.error('Captcha Fetch Error (all origins failed):', lastError?.message);
  return NextResponse.json(
    { error: 'The college ERP server (Accredia) is temporarily unresponsive or rate-limited. Please retry in a moment or toggle your network.' },
    { status: 502 }
  );
}
