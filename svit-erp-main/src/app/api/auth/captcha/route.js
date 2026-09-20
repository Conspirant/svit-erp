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

export async function GET() {
  try {
    // 1. Fetch the parent portal login page to start a new PHP session and extract CSRF tokens
    const initialRes = await axios.get(ERP_BASE_URL, {
      httpsAgent,
      timeout: 12000,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
      },
    });

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
      console.warn('Could not locate 32-char CSRF token, searching all hidden fields with value 1');
      $('input[type="hidden"][value="1"]').each((_, el) => {
        const name = $(el).attr('name');
        if (name && name.length === 32) csrfTokenName = name;
      });
    }

    // 2. Fetch the CAPTCHA image using the newly created session cookie
    const captchaRes = await axios.get(`${ERP_CAPTCHA_URL}?rand=${Date.now()}`, {
      httpsAgent,
      timeout: 12000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Cookie': sessionCookie,
        'Referer': ERP_BASE_URL,
      },
    });

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
