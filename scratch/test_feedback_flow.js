/**
 * Diagnostic script: trace the exact redirect chain & cookie behaviour 
 * of the Accredia ERP feedback flow.
 * 
 * Usage: node scratch/test_feedback_flow.js <PHPSESSID_cookie_value>
 *        (copy the value from browser DevTools → Application → Cookies)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';

// Grab cookie from CLI arg
const phpSessId = process.argv[2];
if (!phpSessId) {
  console.error('Usage: node scratch/test_feedback_flow.js <full_cookie_string>');
  console.error('Example: node scratch/test_feedback_flow.js "PHPSESSID=abc123; other=xyz"');
  process.exit(1);
}

let sessionCookie = phpSessId.includes('=') ? phpSessId : `PHPSESSID=${phpSessId}`;

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

async function tracedGet(url, label) {
  console.log(`\n━━━ GET [${label}] ━━━`);
  console.log(`  URL: ${url.substring(0, 120)}...`);
  console.log(`  Cookie sent: ${sessionCookie.substring(0, 80)}...`);

  const res = await axios.get(url, {
    httpsAgent,
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': sessionCookie,
    },
    maxRedirects: 0,
    validateStatus: () => true,
  });

  const setCookie = res.headers['set-cookie'];
  console.log(`  Status: ${res.status}`);
  console.log(`  Set-Cookie: ${setCookie ? JSON.stringify(setCookie).substring(0, 200) : 'NONE'}`);
  console.log(`  Location: ${res.headers.location || 'NONE'}`);
  console.log(`  Body length: ${(res.data || '').length}`);
  console.log(`  Is login page: ${isLoginPage(res.data || '')}`);

  sessionCookie = updateCookies(sessionCookie, setCookie);
  return res;
}

async function tracedPost(url, data, label) {
  console.log(`\n━━━ POST [${label}] ━━━`);
  console.log(`  URL: ${url.substring(0, 120)}...`);
  console.log(`  Cookie sent: ${sessionCookie.substring(0, 80)}...`);
  console.log(`  Data keys: ${[...new URLSearchParams(data).keys()].join(', ')}`);

  const res = await axios.post(url, data, {
    httpsAgent,
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': sessionCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    maxRedirects: 0,
    validateStatus: () => true,
  });

  const setCookie = res.headers['set-cookie'];
  console.log(`  Status: ${res.status}`);
  console.log(`  Set-Cookie: ${setCookie ? JSON.stringify(setCookie).substring(0, 200) : 'NONE'}`);
  console.log(`  Location: ${res.headers.location || 'NONE'}`);
  console.log(`  Body length: ${(res.data || '').length}`);
  console.log(`  Is login page: ${isLoginPage(res.data || '')}`);

  sessionCookie = updateCookies(sessionCookie, setCookie);
  return res;
}

async function followRedirects(res, label) {
  let hop = 0;
  while ((res.status === 301 || res.status === 302 || res.status === 303) && res.headers.location) {
    hop++;
    const location = res.headers.location;
    const url = location.startsWith('http') ? location : new URL(location, BASE_URL).href;
    res = await tracedGet(url, `${label} redirect-hop-${hop}`);
    if (isLoginPage(res.data || '')) {
      console.log(`  ⚠️  LANDED ON LOGIN PAGE at hop ${hop}!`);
      break;
    }
  }
  return res;
}

(async () => {
  try {
    // Step 1: Fetch feedback types
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 1: Fetch feedback types');
    console.log('═'.repeat(60));
    let res = await tracedGet(`${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedbacktypes`, 'feedbacktypes');
    res = await followRedirects(res, 'feedbacktypes');
    
    const $types = cheerio.load(res.data);
    const feedbackIds = [];
    $types('a').each((i, el) => {
      const href = $types(el).attr('href') || '';
      const text = $types(el).text().trim();
      if (href.includes('feedbackId=')) {
        const idMatch = href.match(/feedbackId=(\d+)/);
        if (idMatch) feedbackIds.push({ id: idMatch[1], name: text, href });
      }
    });
    console.log(`\n  Found feedback types: ${JSON.stringify(feedbackIds.map(f => ({id: f.id, name: f.name})))}`);

    if (feedbackIds.length === 0) {
      console.log('  No feedback types found. Exiting.');
      return;
    }

    // Step 2: Open first feedback type to see faculty list
    const fbId = feedbackIds[feedbackIds.length - 1]; // Use last one (Feedback 2)
    console.log('\n' + '═'.repeat(60));
    console.log(`STEP 2: Fetch faculty list for "${fbId.name}" (id=${fbId.id})`);
    console.log('═'.repeat(60));
    res = await tracedGet(`${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedback&feedbackId=${fbId.id}`, 'feedback-dashboard');
    res = await followRedirects(res, 'feedback-dashboard');

    const $dash = cheerio.load(res.data);
    const pending = [];
    $dash('table').each((tableIdx, table) => {
      $dash(table).find('tr').each((rowIdx, row) => {
        const cells = $dash(row).find('td');
        if (cells.length >= 4) {
          const faculty = cells.eq(0).text().trim();
          let feedbackLink = '';
          $dash(row).find('a').each((j, el) => {
            const href = $dash(el).attr('href') || '';
            const txt = $dash(el).text().toUpperCase().trim();
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
    console.log(`\n  Found ${pending.length} pending faculty feedbacks`);
    if (pending.length > 0) {
      console.log(`  First: ${pending[0].faculty}`);
      console.log(`  URL: ${pending[0].url.substring(0, 120)}...`);
    }

    if (pending.length === 0) {
      console.log('  No pending feedbacks. Perhaps already submitted. Exiting.');
      return;
    }

    // Step 3: Open FIRST feedback form ONLY (don't submit, just check if we can read it)
    console.log('\n' + '═'.repeat(60));
    console.log(`STEP 3: Open feedback form for "${pending[0].faculty}" (DRY RUN - no submit)`);
    console.log('═'.repeat(60));
    
    const formUrl = pending[0].url.startsWith('http') ? pending[0].url : `https://svit-students.accredia.in:8084/${pending[0].url.replace(/^\//, '')}`;
    res = await tracedGet(formUrl, 'form-page');
    res = await followRedirects(res, 'form-page');

    if (isLoginPage(res.data || '')) {
      console.log('\n  ❌ SESSION DIED just by opening the form page! The ksign URL invalidated the session.');
    } else {
      const $form = cheerio.load(res.data);
      const forms = $form('form');
      const radioGroups = {};
      forms.find('input[type="radio"]').each((j, r) => {
        const name = $form(r).attr('name');
        if (name && !radioGroups[name]) radioGroups[name] = [];
        if (name) radioGroups[name].push($form(r).attr('value'));
      });
      const hiddenFields = [];
      forms.find('input[type="hidden"]').each((j, r) => {
        hiddenFields.push($form(r).attr('name'));
      });
      console.log(`\n  ✅ Form loaded successfully!`);
      console.log(`  Forms found: ${forms.length}`);
      console.log(`  Radio groups: ${Object.keys(radioGroups).length}`);
      console.log(`  Hidden fields: ${hiddenFields.join(', ')}`);
      console.log(`  Form action: ${forms.attr('action') || 'NONE'}`);
      
      // Check first radio group
      const firstGroup = Object.entries(radioGroups)[0];
      if (firstGroup) {
        console.log(`  First radio group "${firstGroup[0]}": [${firstGroup[1].join(', ')}]`);
      }
    }

    // Step 4: Check if session is still alive by re-fetching dashboard
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 4: Verify session is still alive');
    console.log('═'.repeat(60));
    res = await tracedGet(`${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedbacktypes`, 'session-check');
    res = await followRedirects(res, 'session-check');
    
    if (isLoginPage(res.data || '')) {
      console.log('\n  ❌ Session DIED after opening the form page! This confirms the issue.');
    } else {
      console.log('\n  ✅ Session is still alive after opening form page.');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('═'.repeat(60));
    console.log(`\nFinal cookie: ${sessionCookie.substring(0, 100)}...`);

  } catch (err) {
    console.error('Fatal error:', err.message);
  }
})();
