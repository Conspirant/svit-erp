import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { setSessionIdentity } from '@/lib/authSession';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 5,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';

export async function POST(request) {
  try {
    let { username, dob } = await request.json();

    if (!username || !dob) {
      return NextResponse.json({ error: 'USN and Date of Birth are required' }, { status: 400 });
    }

    // The ERP expects YYYY-MM-DD. If the user enters DD-MM-YYYY or DD/MM/YYYY, convert it automatically.
    // Support years of any length (e.g. 0001, 2003) by using \d{1,4}
    const dateMatchDMY = dob.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{1,4})$/);
    if (dateMatchDMY) {
      const dd = dateMatchDMY[1].padStart(2, '0');
      const mm = dateMatchDMY[2].padStart(2, '0');
      const yyyy = dateMatchDMY[3].padStart(4, '0');
      dob = `${yyyy}-${mm}-${dd}`;
    }
    // Also handle YYYY-M-D with zero-padding
    const dateMatchYMD = dob.match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})$/);
    if (dateMatchYMD) {
      const yyyy = dateMatchYMD[1].padStart(4, '0');
      const mm = dateMatchYMD[2].padStart(2, '0');
      const dd = dateMatchYMD[3].padStart(2, '0');
      dob = `${yyyy}-${mm}-${dd}`;
    }

    // 1. Fetch the login page to get the session cookie and hidden tokens
    const initialRes = await axios.get(BASE_URL, {
      httpsAgent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const cookiesArray = initialRes.headers['set-cookie'];
    const sessionCookie = cookiesArray ? cookiesArray.map(c => c.split(';')[0]).join('; ') : '';

    const $ = cheerio.load(initialRes.data);
    
    // Find the return token
    const formContainer = $('form').filter((i, el) => $(el).attr('id') === 'login-form' || $(el).find('input[name="username"]').length > 0).last();
    const returnToken = formContainer.find('input[name="return"]').first().val();
    
    // Find the CSRF token (usually a 32 character hex string with value "1")
    let csrfTokenName = '';
    formContainer.find('input[type="hidden"][value="1"]').each((_, el) => {
      const name = $(el).attr('name');
      if (name && name.length === 32) {
        csrfTokenName = name;
      }
    });

    if (!csrfTokenName) {
      return NextResponse.json({ error: 'Failed to parse login form. ERP structure might have changed.' }, { status: 500 });
    }

    // 2. Submit the login POST request
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('passwd', dob); // The JS populates this via check()
    formData.append('password', dob); // The original form also has this field (commented out but may be checked)
    
    // Also append the raw dropdown fields — the official frontend sends these from the selects
    const parsedDate = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parsedDate) {
       formData.append('yyyy', parsedDate[1]);
       formData.append('mm', parsedDate[2]);
       formData.append('dd', parsedDate[3] + ' '); // The official frontend has a trailing space in the day options
    } else {
       // if they typed something completely custom that wasn't converted
       formData.append('yyyy', '');
       formData.append('mm', '');
       formData.append('dd', '');
    }

    formData.append('option', 'com_user');
    formData.append('task', 'login');
    if (returnToken) formData.append('return', returnToken);
    formData.append(csrfTokenName, '1');

    const loginRes = await axios.post(BASE_URL, formData.toString(), {
      httpsAgent,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': sessionCookie,
        'Referer': BASE_URL,
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const loginCookies = loginRes.headers['set-cookie'];
    const finalCookie = loginCookies ? loginCookies.map(c => c.split(';')[0]).join('; ') : sessionCookie;

    const redirectLocation = loginRes.headers.location;

    // A failed login might return 200 OK with the login page
    if (loginRes.status === 200 && loginRes.data.includes('Login to Your Account')) {
      const $errorPage = cheerio.load(loginRes.data);
      const errorMsg = $errorPage('.alert-error, .uk-alert-danger').text().trim() || 'Invalid USN or Date of Birth. Login failed.';
      return NextResponse.json({ error: errorMsg }, { status: 401 });
    }

    // A failed login might also return a 302/303 redirect back to the home/login page
    if (loginRes.status >= 300 && loginRes.status < 400 && redirectLocation) {
        if (redirectLocation.endsWith('index.php') || redirectLocation.includes('com_user')) {
            return NextResponse.json({ error: 'Invalid USN or Password. Login failed.' }, { status: 401 });
        }
    }

    // Set the cookie in Next.js response so the user's browser holds the ERP session
    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });
    
    // Store the redirect location if provided
    if (redirectLocation) {
      // It might be a relative or absolute URL
      const fullRedirectUrl = redirectLocation.startsWith('http') 
        ? redirectLocation 
        : `https://svit-students.accredia.in:8084/${redirectLocation.replace(/^\//, '')}`;
        
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
      cookieParts.forEach(part => {
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
    console.error('Login Proxy Error:', error.message);
    return NextResponse.json({ error: 'An error occurred while communicating with the ERP server.' }, { status: 500 });
  }
}
