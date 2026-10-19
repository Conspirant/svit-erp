import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  ERP_BASE_URL,
  ERP_CAPTCHA_URL,
  DEFAULT_USER_AGENT,
  createHttpsAgent,
} from '@/lib/erpConfig';

const httpsAgent = createHttpsAgent();

async function fetchWithRetry(fn, retries = 2, delayMs = 600) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}

export async function GET() {
  try {
    const commonHeaders = {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    };

    // 1. Fetch the parent portal login page to start a new PHP session and extract CSRF tokens
    const initialRes = await fetchWithRetry(() =>
      axios.get(ERP_BASE_URL, {
        httpsAgent,
        timeout: 20000,
        headers: commonHeaders,
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

    // 2. Fetch the CAPTCHA image using the newly created session cookie
    const captchaRes = await fetchWithRetry(() =>
      axios.get(`${ERP_CAPTCHA_URL}?rand=${Date.now()}`, {
        httpsAgent,
        timeout: 20000,
        responseType: 'arraybuffer',
        headers: {
          ...commonHeaders,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'same-origin',
          'Cookie': sessionCookie,
          'Referer': ERP_BASE_URL,
        },
      })
    );

    // Merge any updated cookies from the captcha response
    if (captchaRes.headers['set-cookie']) {
      const moreCookies = captchaRes.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
      sessionCookie = sessionCookie ? `${sessionCookie}; ${moreCookies}` : moreCookies;
    }

    const base64Image = Buffer.from(captchaRes.data).toString('base64');
    const captchaDataUrl = `data:image/jpeg;base64,${base64Image}`;

    const sessionData = JSON.stringify({
      sessionCookie,
      csrfTokenName,
      returnToken,
      timestamp: Date.now(),
    });

    const response = NextResponse.json({
      success: true,
      captchaImage: captchaDataUrl,
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
  } catch (error) {
    console.error('Captcha Fetch Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to load CAPTCHA from ERP server. Please try refreshing.' },
      { status: 500 }
    );
  }
}
