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

    let targetUrl = BASE_URL;
    if ((loginRes.status === 302 || loginRes.status === 303) && loginRes.headers.location) {
      targetUrl = loginRes.headers.location.startsWith('http')
        ? loginRes.headers.location
        : `https://svit-students.accredia.in:8084/${loginRes.headers.location.replace(/^\//, '')}`;
      
      console.log(`[3] Following login redirect...`);
      const redirRes = await axios.get(targetUrl, {
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
      });
      sessionCookie = updateCookies(sessionCookie, redirRes.headers['set-cookie']);
    }

    console.log(`[4] Fetching feedback dashboard...`);
    const feedbackUrl = `${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedback&feedbackId=2`;
    const fbRes = await axios.get(feedbackUrl, {
      httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
    });
    sessionCookie = updateCookies(sessionCookie, fbRes.headers['set-cookie']);
    console.log(`    Feedback dashboard page is login? ${isLoginPage(fbRes.data)}`);

    const $fb = cheerio.load(fbRes.data);
    const pending = [];
    $fb('table').each((tableIdx, table) => {
      $fb(table).find('tr').each((rowIdx, row) => {
        const cells = $fb(row).find('td');
        if (cells.length >= 4) {
          const faculty = cells.eq(0).text().trim();
          let feedbackLink = '';
          $fb(row).find('a').each((j, el) => {
            const href = $fb(el).attr('href') || '';
            const txt = $fb(el).text().toUpperCase().trim();
            if (href && (href.includes('feedbackform') || txt.includes('GIVE') || txt.includes('FEEDBACK'))) {
              feedbackLink = href;
            }
          });
          if (feedbackLink) {
            pending.push({ faculty, url: feedbackLink });
          }
        }
      });
    });

    console.log(`    Found ${pending.length} pending feedbacks.`);
    if (pending.length === 0) {
      console.log(`    No pending feedbacks to submit!`);
      return;
    }

    const currentItem = pending[0];
    const formUrl = currentItem.url.startsWith('http') ? currentItem.url : `https://svit-students.accredia.in:8084/${currentItem.url.replace(/^\//, '')}`;
    console.log(`[5] Fetching form for ${currentItem.faculty} from: ${formUrl}`);
    
    const formPageRes = await axios.get(formUrl, {
      httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
    });
    sessionCookie = updateCookies(sessionCookie, formPageRes.headers['set-cookie']);
    console.log(`    Form page is login? ${isLoginPage(formPageRes.data)}`);

    const $formPage = cheerio.load(formPageRes.data);
    const forms = $formPage('form');
    console.log(`    Total forms found: ${forms.length}`);
    let form = null;
    forms.each((idx, el) => {
      const f = $formPage(el);
      const hasRadios = f.find('input[type="radio"]').length > 0;
      const hasTeacherId = f.find('input[name="teacherId"]').length > 0;
      console.log(`    Form ${idx}: action=${f.attr('action')}, id=${f.attr('id')}, hasRadios=${hasRadios}, hasTeacherId=${hasTeacherId}`);
      if (hasRadios || hasTeacherId) {
        form = f;
      }
    });

    if (!form) {
      console.log(`    ERROR: Form not found!`);
      return;
    }

    const action = form.attr('action') || 'index.php?option=com_feedback&controller=feedbackentry';
    const postUrl = action.startsWith('http') ? action : `https://svit-students.accredia.in:8084/${action.replace(/^\//, '')}`;

    const postData = new URLSearchParams();

    // Hidden inputs
    form.find('input[type="hidden"], input[type="text"]').each((j, input) => {
      const name = $formPage(input).attr('name');
      const val = $formPage(input).attr('value') || '';
      if (name) {
        postData.append(name, val);
        console.log(`    Input field: ${name} = ${val}`);
      }
    });

    // Selects
    form.find('select').each((j, sel) => {
      const name = $formPage(sel).attr('name');
      const val = $formPage(sel).find('option[selected]').attr('value') || $formPage(sel).find('option').first().attr('value') || '';
      if (name) {
        postData.append(name, val);
        console.log(`    Select field: ${name} = ${val}`);
      }
    });

    // Textareas
    form.find('textarea').each((j, ta) => {
      const name = $formPage(ta).attr('name');
      if (name) {
        postData.append(name, "Excellent teaching, supportive, and covers syllabus thoroughly.");
        console.log(`    Textarea field: ${name}`);
      }
    });

    // Radios
    const radioGroups = {};
    form.find('input[type="radio"]').each((j, radio) => {
      const name = $formPage(radio).attr('name');
      const val = $formPage(radio).attr('value') || '';
      if (name) {
        if (!radioGroups[name]) {
          radioGroups[name] = [];
        }
        radioGroups[name].push(val);
      }
    });

    Object.entries(radioGroups).forEach(([name, values]) => {
      const selectedValue = values[0]; // Select Excellent (index 0)
      postData.append(name, selectedValue);
    });
    console.log(`    Found ${Object.keys(radioGroups).length} radio questions.`);

    // Submit buttons
    form.find('input[type="submit"], button[type="submit"]').each((j, btn) => {
      const name = $formPage(btn).attr('name');
      const val = $formPage(btn).attr('value') || 'Submit';
      if (name) {
        postData.append(name, val);
        console.log(`    Submit button field: ${name} = ${val}`);
      }
    });

    console.log(`[6] Submitting feedback form to: ${postUrl}`);
    const postRes = await axios.post(postUrl, postData.toString(), {
      httpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Cookie': sessionCookie,
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    sessionCookie = updateCookies(sessionCookie, postRes.headers['set-cookie']);
    console.log(`    Post status: ${postRes.status}`);
    console.log(`    Post Location redirect: ${postRes.headers.location}`);
    console.log(`    Post page is login? ${isLoginPage(postRes.data)}`);

    // Let's follow redirects
    let currentRes = postRes;
    let hop = 0;
    while ((currentRes.status === 301 || currentRes.status === 302 || currentRes.status === 303) && hop < 5) {
      hop++;
      const location = currentRes.headers.location;
      const nextUrl = location.startsWith('http') ? location : `https://svit-students.accredia.in:8084/${location.replace(/^\//, '')}`;
      console.log(`    Follow redirect hop ${hop} to: ${nextUrl}`);
      currentRes = await axios.get(nextUrl, {
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
        maxRedirects: 0,
        validateStatus: () => true,
      });
      sessionCookie = updateCookies(sessionCookie, currentRes.headers['set-cookie']);
      console.log(`      Status: ${currentRes.status}`);
      console.log(`      Is login: ${isLoginPage(currentRes.data)}`);
    }

    console.log(`[7] Verify session is still alive by fetching feedback dashboard...`);
    const finalRes = await axios.get(feedbackUrl, {
      httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': sessionCookie },
    });
    console.log(`    Final page is login? ${isLoginPage(finalRes.data)}`);

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
