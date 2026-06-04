const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';

const username = process.argv[2];
const dob = process.argv[3];

if (!username || !dob) {
  console.error('Usage: node test_feedback_auth.js <USN> <DOB_YYYY-MM-DD>');
  process.exit(1);
}

function updateCookies(current, setCookieHeader) {
  if (!setCookieHeader) return current;
  const cookies = {};
  if (current) {
    current.split(';').forEach(c => {
      const parts = c.trim().split('=');
      if (parts[0]) cookies[parts[0].trim()] = parts.slice(1).join('=');
    });
  }
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  headers.forEach(h => {
    const cookiePart = h.split(';')[0];
    const parts = cookiePart.trim().split('=');
    if (parts[0]) cookies[parts[0].trim()] = parts.slice(1).join('=');
  });
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

function isLoginPage(html) {
  return html.includes('name="username"') || html.includes('Login to Your Account');
}

async function run() {
  try {
    console.log(`[1] Fetching login page to get CSRF token...`);
    const initialRes = await axios.get(BASE_URL, {
      httpsAgent,
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    let sessionCookie = initialRes.headers['set-cookie']
      ? initialRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
      : '';

    const $ = cheerio.load(initialRes.data);
    const formContainer = $('form').last();
    const returnToken = formContainer.find('input[name="return"]').first().val();
    
    let csrfTokenName = '';
    formContainer.find('input[type="hidden"][value="1"]').each((_, el) => {
      const name = $(el).attr('name');
      if (name && name.length === 32) {
        csrfTokenName = name;
      }
    });

    console.log(`    CSRF Token Name: ${csrfTokenName}`);
    console.log(`    Return Token: ${returnToken}`);

    // Convert DOB if needed
    let formattedDob = dob;
    const dateMatchYMD = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('passwd', formattedDob);
    formData.append('password', formattedDob);
    if (dateMatchYMD) {
       formData.append('yyyy', dateMatchYMD[1]);
       formData.append('mm', dateMatchYMD[2]);
       formData.append('dd', dateMatchYMD[3] + ' ');
    }
    formData.append('option', 'com_user');
    formData.append('task', 'login');
    if (returnToken) formData.append('return', returnToken);
    formData.append(csrfTokenName, '1');

    console.log(`[2] Submitting login form...`);
    const loginRes = await axios.post(BASE_URL, formData.toString(), {
      httpsAgent,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Cookie': sessionCookie,
        'Referer': BASE_URL,
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    sessionCookie = updateCookies(sessionCookie, loginRes.headers['set-cookie']);
    console.log(`    Login Status: ${loginRes.status}`);
    console.log(`    Redirect Location: ${loginRes.headers.location}`);

    // If redirected, follow it
    let targetUrl = BASE_URL;
    if ((loginRes.status === 302 || loginRes.status === 303) && loginRes.headers.location) {
      targetUrl = loginRes.headers.location.startsWith('http')
        ? loginRes.headers.location
        : `https://svit-students.accredia.in:8084/${loginRes.headers.location.replace(/^\//, '')}`;
      
      console.log(`[3] Following login redirect to: ${targetUrl}`);
      const redirRes = await axios.get(targetUrl, {
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
      });
      sessionCookie = updateCookies(sessionCookie, redirRes.headers['set-cookie']);
      console.log(`    Redirect page is login page? ${isLoginPage(redirRes.data)}`);
    }

    console.log(`[4] Fetching feedback types page (task=feedbacktypes)...`);
    const listUrl = `${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedbacktypes`;
    const listRes = await axios.get(listUrl, {
      httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
    });
    sessionCookie = updateCookies(sessionCookie, listRes.headers['set-cookie']);
    console.log(`    feedbacktypes page length: ${listRes.data.length}`);
    console.log(`    feedbacktypes is login page? ${isLoginPage(listRes.data)}`);

    const $list = cheerio.load(listRes.data);
    let signedUrl = '';
    $list('a').each((i, el) => {
      const href = $list(el).attr('href') || '';
      const text = $list(el).text().trim();
      console.log(`    Link found: [${text}] -> ${href}`);
      if (href.includes('feedbackId=2')) {
        signedUrl = href;
      }
    });

    console.log(`[5] Selected signed URL: ${signedUrl}`);
    if (signedUrl) {
      const fullSignedUrl = signedUrl.startsWith('http') ? signedUrl : `https://svit-students.accredia.in:8084/${signedUrl.replace(/^\//, '')}`;
      const detailRes = await axios.get(fullSignedUrl, {
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
      });
      sessionCookie = updateCookies(sessionCookie, detailRes.headers['set-cookie']);
      console.log(`    Feedback detail status: ${detailRes.status}`);
      console.log(`    Feedback detail page length: ${detailRes.data.length}`);
      console.log(`    Feedback detail is login page? ${isLoginPage(detailRes.data)}`);

      console.log(`[6] Checking if session is still alive by fetching feedback types page again...`);
      const listRes2 = await axios.get(listUrl, {
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
      });
      console.log(`    Second feedbacktypes page length: ${listRes2.data.length}`);
      console.log(`    Second feedbacktypes is login page? ${isLoginPage(listRes2.data)}`);
    }

  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
