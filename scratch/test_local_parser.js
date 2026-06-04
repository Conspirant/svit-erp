const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';
const username = '1VA25CD092';
const dob = '2005-05-16';

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

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('passwd', dob);
    formData.append('password', dob);
    formData.append('yyyy', '2005');
    formData.append('mm', '05');
    formData.append('dd', '16 ');
    formData.append('option', 'com_user');
    formData.append('task', 'login');
    if (returnToken) formData.append('return', returnToken);
    formData.append(csrfTokenName, '1');

    console.log(`[2] Submitting login...`);
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

    let targetUrl = BASE_URL;
    if ((loginRes.status === 302 || loginRes.status === 303) && loginRes.headers.location) {
      targetUrl = loginRes.headers.location.startsWith('http')
        ? loginRes.headers.location
        : `https://svit-students.accredia.in:8084/${loginRes.headers.location.replace(/^\//, '')}`;
      
      console.log(`[3] Following redirect...`);
      const redirRes = await axios.get(targetUrl, {
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
      });
      sessionCookie = updateCookies(sessionCookie, redirRes.headers['set-cookie']);
    }

    console.log(`[4] Fetching LOCAL API feedback endpoint...`);
    const localRes = await axios.get('http://localhost:3000/api/student/feedback?feedbackId=2', {
      httpsAgent,
      headers: {
        'Cookie': `${sessionCookie}; erp_usn=${username}; erp_name=RISHAB P Y`
      }
    });

    console.log('API RESPONSE DATA:');
    console.log(`Success: ${localRes.data.success}`);
    console.log(`Title: ${localRes.data.data.title}`);
    console.log(`Pending count: ${localRes.data.data.pending.length}`);
    console.log(`Completed count: ${localRes.data.data.completed.length}`);
    console.log(`Has Acknowledgement: ${localRes.data.data.hasAcknowledgement}`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
