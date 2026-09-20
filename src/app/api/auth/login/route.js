import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { setSessionIdentity } from '@/lib/authSession';
import {
  ERP_BASE_URL,
  DEFAULT_USER_AGENT,
  createHttpsAgent,
  resolveErpUrl,
} from '@/lib/erpConfig';

const httpsAgent = createHttpsAgent();

export async function POST(request) {
  try {
    const body = await request.json();
    let { username, dob } = body;
    const captcha = (body.captcha || body.securityCode || '').trim();

    if (!username || !dob) {
      return NextResponse.json({ error: 'USN and Date of Birth are required' }, { status: 400 });
    }

    if (!captcha) {
      return NextResponse.json({ error: 'Please enter the CAPTCHA code', captchaExpired: false }, { status: 400 });
    }

    username = username.trim().toUpperCase();

    // The ERP expects YYYY-MM-DD. If the user enters DD-MM-YYYY or DD/MM/YYYY, convert it automatically.
    const dateMatchDMY = dob.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{1,4})$/);
    if (dateMatchDMY) {
      const dd = dateMatchDMY[1].padStart(2, '0');
      const mm = dateMatchDMY[2].padStart(2, '0');
      const yyyy = dateMatchDMY[3].padStart(4, '0');
      dob = `${yyyy}-${mm}-${dd}`;
    }
    const dateMatchYMD = dob.match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})$/);
    if (dateMatchYMD) {
      const yyyy = dateMatchYMD[1].padStart(4, '0');
      const mm = dateMatchYMD[2].padStart(2, '0');
      const dd = dateMatchYMD[3].padStart(2, '0');
      dob = `${yyyy}-${mm}-${dd}`;
    }

    // 1. Recover the session cookie and CSRF token created during CAPTCHA generation
    let sessionCookie = '';
    let returnToken = '';
    let csrfTokenName = '';

    const pendingSessionRaw = request.cookies.get('erp_login_session')?.value;
    if (pendingSessionRaw) {
      try {
        const decoded = JSON.parse(Buffer.from(pendingSessionRaw, 'base64').toString('utf8'));
        sessionCookie = decoded.sessionCookie || '';
        returnToken = decoded.returnToken || '';
        csrfTokenName = decoded.csrfTokenName || '';
      } catch (e) {
        console.warn('Failed to parse pending login session cookie:', e.message);
      }
    }

    // If we have no session cookie from captcha, fetch the login page as fallback
    if (!sessionCookie || !csrfTokenName) {
      const initialRes = await axios.get(ERP_BASE_URL, {
        httpsAgent,
        timeout: 15000,
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
        },
      });

      const cookiesArray = initialRes.headers['set-cookie'];
      sessionCookie = cookiesArray ? cookiesArray.map((c) => c.split(';')[0]).join('; ') : '';

      const $ = cheerio.load(initialRes.data);
      const formContainer = $('form')
        .filter((i, el) => $(el).attr('id') === 'login-form' || $(el).find('input[name="username"]').length > 0)
        .last();

      returnToken = returnToken || formContainer.find('input[name="return"]').first().val() || '';

      formContainer.find('input[type="hidden"][value="1"]').each((_, el) => {
        const name = $(el).attr('name');
        if (name && name.length === 32) {
          csrfTokenName = name;
        }
      });
    }

    if (!csrfTokenName) {
      return NextResponse.json(
        { error: 'Failed to parse login form. Please reload the page and try again.', captchaExpired: true },
        { status: 500 }
      );
    }

    // 2. Submit the login POST request with CAPTCHA
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('passwd', dob);
    formData.append('password', dob);

    const parsedDate = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parsedDate) {
      formData.append('yyyy', parsedDate[1]);
      formData.append('mm', parsedDate[2]);
      formData.append('dd', parsedDate[3] + ' '); // Official frontend sends day with trailing space
    } else {
      formData.append('yyyy', '');
      formData.append('mm', '');
      formData.append('dd', '');
    }

    formData.append('securityCode', captcha);
    formData.append('remember', 'No');
    formData.append('option', 'com_user');
    formData.append('task', 'login');
    if (returnToken) formData.append('return', returnToken);
    formData.append(csrfTokenName, '1');

    const loginRes = await axios.post(ERP_BASE_URL, formData.toString(), {
      httpsAgent,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': DEFAULT_USER_AGENT,
        'Cookie': sessionCookie,
        'Referer': ERP_BASE_URL,
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const loginCookies = loginRes.headers['set-cookie'];
    const finalCookie = loginCookies
      ? loginCookies.map((c) => c.split(';')[0]).join('; ')
      : sessionCookie;

    const redirectLocation = loginRes.headers.location;

    // Check if the server rendered an error on the page
    if (loginRes.status === 200) {
      const responseText = typeof loginRes.data === 'string' ? loginRes.data : '';

      // Check for CAPTCHA specific error
      if (
        responseText.includes('captchaErrorModal') ||
        responseText.toLowerCase().includes('invalid captcha') ||
        responseText.toLowerCase().includes('code you entered is incorrect')
      ) {
        return NextResponse.json(
          { error: 'Invalid CAPTCHA code. Please check and try again.', captchaExpired: true },
          { status: 401 }
        );
      }

      if (responseText.includes('Login to Your Account')) {
        const $errorPage = cheerio.load(responseText);
        const errorMsg =
          $errorPage('.alert-error, .uk-alert-danger').text().trim() ||
          'Invalid USN, Password, or CAPTCHA. Login failed.';
        return NextResponse.json({ error: errorMsg, captchaExpired: true }, { status: 401 });
      }
    }

    // A failed login might also return a redirect back to login without a ksign session
    if (loginRes.status >= 300 && loginRes.status < 400 && redirectLocation) {
      const isStillLogin =
        (redirectLocation.endsWith('index.php') || redirectLocation.includes('com_user')) &&
        !redirectLocation.includes('ksign=');

      if (isStillLogin) {
        return NextResponse.json(
          { error: 'Invalid USN or Password. Login failed.', captchaExpired: true },
          { status: 401 }
        );
      }
    }

    // Set the cookie in Next.js response so the user's browser holds the ERP session
    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });

    // Clear the temporary captcha session cookie
    response.cookies.delete('erp_login_session');

    // Store the redirect location if provided
    if (redirectLocation) {
      const fullRedirectUrl = resolveErpUrl(redirectLocation);
      response.cookies.set({
        name: 'dashboard_url',
        value: fullRedirectUrl,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
    }

    // Parse the actual PHPSESSID or relevant cookies and set them
    if (finalCookie) {
      const cookieParts = finalCookie.split(';');
      cookieParts.forEach((part) => {
        const [name, ...rest] = part.split('=');
        if (name && rest.length > 0) {
          response.cookies.set({
            name: name.trim(),
            value: rest.join('=').trim(),
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24, // 1 day
          });
        }
      });
    }

    setSessionIdentity(response, { usn: username });
    return response;
  } catch (error) {
    console.error('Login Proxy Error:', error.message, error.stack);
    return NextResponse.json(
      { error: error.message || 'An error occurred while communicating with the ERP server.', captchaExpired: true },
      { status: 500 }
    );
  }
}
