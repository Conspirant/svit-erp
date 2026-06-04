/**
 * ERP Deep Probe — Logs in and discovers ALL accessible pages
 * Uses the actual login flow from the app's auth route
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';

const USN = '1VA25CD092';
const DOB = '2005-05-16'; // YYYY-MM-DD format

async function login() {
  console.log('🔐 Phase 0: Logging into ERP...\n');

  // 1. Get login page for CSRF token
  const initialRes = await axios.get(BASE_URL, {
    httpsAgent,
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  const cookiesArray = initialRes.headers['set-cookie'];
  const sessionCookie = cookiesArray ? cookiesArray.map(c => c.split(';')[0]).join('; ') : '';

  const $ = cheerio.load(initialRes.data);
  const formContainer = $('form').filter((i, el) => $(el).attr('id') === 'login-form' || $(el).find('input[name="username"]').length > 0).last();
  const returnToken = formContainer.find('input[name="return"]').first().val();

  let csrfTokenName = '';
  formContainer.find('input[type="hidden"][value="1"]').each((_, el) => {
    const name = $(el).attr('name');
    if (name && name.length === 32) csrfTokenName = name;
  });

  if (!csrfTokenName) throw new Error('Could not find CSRF token');

  // 2. Submit login
  const formData = new URLSearchParams();
  formData.append('username', USN);
  formData.append('passwd', DOB);
  formData.append('password', DOB);
  formData.append('yyyy', '2005');
  formData.append('mm', '05');
  formData.append('dd', '16 ');
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
  const redirectUrl = loginRes.headers.location;

  if (loginRes.status === 200 && loginRes.data.includes('Login to Your Account')) {
    throw new Error('Login failed — invalid credentials');
  }

  let dashboardUrl = BASE_URL;
  if (redirectUrl) {
    dashboardUrl = redirectUrl.startsWith('http') ? redirectUrl : `https://svit-students.accredia.in:8084/${redirectUrl.replace(/^\//, '')}`;
  }

  console.log(`   ✅ Logged in! Session: ${finalCookie.substring(0, 40)}...`);
  console.log(`   📍 Dashboard URL: ${dashboardUrl}\n`);

  return { cookie: finalCookie, dashboardUrl };
}

async function fetchPage(url, cookie) {
  const res = await axios.get(url, {
    httpsAgent,
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookie,
    },
    maxRedirects: 3,
    validateStatus: () => true,
  });
  return res;
}

async function probe() {
  const { cookie, dashboardUrl } = await login();

  // ═══════════════════════════════════════════════
  // Phase 1: Crawl the dashboard and extract ALL links
  // ═══════════════════════════════════════════════
  console.log('🔍 Phase 1: Crawling dashboard page for ALL links...\n');

  const dashRes = await fetchPage(dashboardUrl, cookie);
  const $ = cheerio.load(dashRes.data);

  // Extract ALL links
  const allLinks = new Map(); // href -> { text, context }

  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim().replace(/\s+/g, ' ').substring(0, 80);
    const parentText = $(el).parent().text().trim().replace(/\s+/g, ' ').substring(0, 60);

    if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

    // Make absolute
    let fullUrl = href;
    if (!href.startsWith('http')) {
      fullUrl = `https://svit-students.accredia.in:8084/${href.replace(/^\//, '')}`;
    }

    if (!allLinks.has(fullUrl)) {
      allLinks.set(fullUrl, { text, parentText, href });
    }
  });

  console.log(`   Found ${allLinks.size} unique links on dashboard\n`);

  // Categorize links
  const erpLinks = [];    // Links to ERP pages (index.php?option=...)
  const fileLinks = [];   // PDFs, docs, etc.
  const otherLinks = [];  // External or other

  for (const [url, info] of allLinks) {
    if (url.includes('index.php') && (url.includes('option=') || url.includes('task='))) {
      erpLinks.push({ url, ...info });
    } else if (url.match(/\.(pdf|doc|docx|xls|xlsx|csv|zip|jpg|png)/i)) {
      fileLinks.push({ url, ...info });
    } else {
      otherLinks.push({ url, ...info });
    }
  }

  console.log('   📊 Link Categories:');
  console.log(`      ERP pages: ${erpLinks.length}`);
  console.log(`      Files: ${fileLinks.length}`);
  console.log(`      Other: ${otherLinks.length}\n`);

  // Print all ERP links
  console.log('   🔗 ALL ERP Links Found:');
  erpLinks.forEach((link, i) => {
    // Extract query params
    try {
      const urlObj = new URL(link.url);
      const option = urlObj.searchParams.get('option') || '';
      const controller = urlObj.searchParams.get('controller') || '';
      const task = urlObj.searchParams.get('task') || '';
      console.log(`      ${i + 1}. [${option}/${controller}/${task}] "${link.text}" → ${link.href.substring(0, 100)}`);
    } catch {
      console.log(`      ${i + 1}. "${link.text}" → ${link.url.substring(0, 100)}`);
    }
  });

  if (fileLinks.length > 0) {
    console.log('\n   📄 File Links Found:');
    fileLinks.forEach((link, i) => {
      console.log(`      ${i + 1}. "${link.text}" → ${link.url.substring(0, 120)}`);
    });
  }

  // ═══════════════════════════════════════════════
  // Phase 2: Extract ALL navigation/menu items
  // ═══════════════════════════════════════════════
  console.log('\n🔍 Phase 2: Extracting navigation menus...\n');

  const menuItems = [];
  $('nav a, .menu a, .nav a, .sidebar a, ul.uk-nav a, .uk-navbar a, [class*="menu"] a, [class*="nav"] a, [class*="sidebar"] a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text && href && href !== '#' && !href.startsWith('javascript:')) {
      menuItems.push({ text: text.substring(0, 60), href: href.substring(0, 120) });
    }
  });

  const uniqueMenuItems = [...new Map(menuItems.map(m => [m.href, m])).values()];
  console.log(`   Found ${uniqueMenuItems.length} unique menu/nav items:`);
  uniqueMenuItems.forEach((m, i) => {
    console.log(`      ${i + 1}. "${m.text}" → ${m.href}`);
  });

  // ═══════════════════════════════════════════════
  // Phase 3: Extract data from inline scripts (charts, configs)
  // ═══════════════════════════════════════════════
  console.log('\n🔍 Phase 3: Mining inline scripts for hidden data...\n');

  const scripts = $('script').map((i, el) => $(el).html()).get().filter(Boolean);
  console.log(`   Found ${scripts.length} script blocks`);

  scripts.forEach((script, i) => {
    // Look for interesting patterns
    if (script.includes('gauge') || script.includes('bar') || script.includes('chart') || script.includes('data:')) {
      console.log(`\n   📊 Script ${i + 1} contains chart/data:`);
      // Extract data arrays
      const dataMatches = script.match(/\[\s*"[^"]+"\s*,\s*[0-9.]+\s*\]/g) || [];
      if (dataMatches.length > 0) {
        console.log(`      Data points: ${dataMatches.join(' | ')}`);
      }
      // Extract any URLs
      const urlMatches = script.match(/['"](?:https?:\/\/[^'"]+|index\.php[^'"]+)['"]/g) || [];
      if (urlMatches.length > 0) {
        console.log(`      URLs in script: ${urlMatches.join(' | ')}`);
      }
    }

    // Look for config objects
    if (script.includes('option') && script.includes('task') && script.length < 2000) {
      console.log(`\n   ⚙️ Script ${i + 1} might contain config:`);
      console.log(`      ${script.substring(0, 300).replace(/\s+/g, ' ')}`);
    }
  });

  // ═══════════════════════════════════════════════
  // Phase 4: Follow unique ERP links and scrape each page
  // ═══════════════════════════════════════════════
  console.log('\n\n🔍 Phase 4: Deep crawling discovered ERP pages...\n');

  // Deduplicate by task param (many links go to same page with different course params)
  const uniquePages = new Map();
  erpLinks.forEach(link => {
    try {
      const urlObj = new URL(link.url);
      const option = urlObj.searchParams.get('option') || '';
      const controller = urlObj.searchParams.get('controller') || '';
      const task = urlObj.searchParams.get('task') || '';
      const key = `${option}|${controller}|${task}`;
      if (!uniquePages.has(key)) {
        uniquePages.set(key, link);
      }
    } catch {
      uniquePages.set(link.url, link);
    }
  });

  console.log(`   ${uniquePages.size} unique page types to crawl\n`);

  // Also probe common hidden endpoints that might not be linked
  const hiddenProbes = [
    { url: `${BASE_URL}?option=com_fee&controller=fee&task=studFee`, text: 'Fee Details (hidden)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=academiccal&task=calenderdisplay&yearId=`, text: 'Academic Calendar (hidden)' },
    { url: `${BASE_URL}?option=com_hallticket`, text: 'Hall Ticket (probe)' },
    { url: `${BASE_URL}?option=com_result`, text: 'Results (probe)' },
    { url: `${BASE_URL}?option=com_library`, text: 'Library (probe)' },
    { url: `${BASE_URL}?option=com_feedback`, text: 'Feedback (probe)' },
    { url: `${BASE_URL}?option=com_hostel`, text: 'Hostel (probe)' },
    { url: `${BASE_URL}?option=com_transport`, text: 'Transport (probe)' },
    { url: `${BASE_URL}?option=com_placement`, text: 'Placement (probe)' },
    { url: `${BASE_URL}?option=com_notification`, text: 'Notifications (probe)' },
    { url: `${BASE_URL}?option=com_certificate`, text: 'Certificates (probe)' },
    { url: `${BASE_URL}?option=com_bonafide`, text: 'Bonafide (probe)' },
    { url: `${BASE_URL}?option=com_scholarship`, text: 'Scholarship (probe)' },
    { url: `${BASE_URL}?option=com_grievance`, text: 'Grievance (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=exam`, text: 'Exam Controller (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=hallticket`, text: 'Hall Ticket Controller (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=result`, text: 'Result Controller (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=feedback`, text: 'Feedback Controller (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=noticeboard`, text: 'Notice Board (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=library`, text: 'Library Controller (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=hostel`, text: 'Hostel Controller (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=fee&task=feereceipt`, text: 'Fee Receipt (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=fee&task=studFee`, text: 'Fee via BVBSIMS (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=student&task=profile`, text: 'Student Profile (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=placement`, text: 'Placement via BVBSIMS (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=syllabus`, text: 'Syllabus (probe)' },
    { url: `${BASE_URL}?option=com_bvbsims&controller=timetable`, text: 'Timetable via BVBSIMS (probe)' },
    { url: `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=hallticket`, text: 'Dashboard Hall Ticket (probe)' },
    { url: `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=feereceipt`, text: 'Dashboard Fee Receipt (probe)' },
    { url: `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=notification`, text: 'Dashboard Notifications (probe)' },
    { url: `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=feedback`, text: 'Dashboard Feedback (probe)' },
  ];

  // Add hidden probes to the crawl list
  hiddenProbes.forEach(probe => {
    const key = `probe_${probe.text}`;
    if (!uniquePages.has(key)) {
      uniquePages.set(key, probe);
    }
  });

  const crawlResults = [];

  for (const [key, link] of uniquePages) {
    process.stdout.write(`   Crawling: "${link.text.substring(0, 40)}"...`);

    try {
      const res = await fetchPage(link.url, cookie);
      const page$ = cheerio.load(res.data || '');
      const bodyText = page$('body').text().replace(/\s+/g, ' ').trim();
      const isLoginPage = page$('input[name="username"]').length > 0 || bodyText.includes('Login to Your Account');
      const title = page$('title').text().trim();

      if (isLoginPage) {
        process.stdout.write(' 🔒 login wall\n');
        continue;
      }

      if (bodyText.length < 100) {
        process.stdout.write(' ⚫ empty\n');
        continue;
      }

      // Extract page data
      const tables = [];
      page$('table').each((i, table) => {
        const rows = [];
        page$(table).find('tr').each((j, row) => {
          const cells = page$(row).find('th, td').map((k, cell) => page$(cell).text().trim().replace(/\s+/g, ' ')).get();
          if (cells.length > 0) rows.push(cells);
        });
        if (rows.length > 1) tables.push(rows);
      });

      const headings = [];
      page$('h1, h2, h3, h4').each((i, el) => {
        const t = page$(el).text().trim().replace(/\s+/g, ' ');
        if (t.length > 2 && t.length < 100) headings.push(t);
      });

      const downloads = [];
      page$('a').each((i, el) => {
        const href = page$(el).attr('href') || '';
        const text = page$(el).text().trim();
        if (href.match(/\.(pdf|doc|docx|xls|xlsx|csv|zip)/i) ||
            text.match(/download|receipt|ticket|certificate|print/i)) {
          downloads.push({ text: text.substring(0, 60), href: href.substring(0, 150) });
        }
      });

      const forms = [];
      page$('form').each((i, el) => {
        const action = page$(el).attr('action') || '';
        const method = page$(el).attr('method') || 'GET';
        const inputs = page$(el).find('input, select, textarea').map((j, inp) => {
          return page$(inp).attr('name') || '';
        }).get().filter(Boolean);
        forms.push({ action: action.substring(0, 100), method, inputs });
      });

      // Find sub-links on this page that lead to MORE ERP pages
      const subLinks = [];
      page$('a').each((i, el) => {
        const href = page$(el).attr('href') || '';
        const text = page$(el).text().trim().replace(/\s+/g, ' ');
        if (href.includes('index.php') && (href.includes('option=') || href.includes('task='))) {
          subLinks.push({ text: text.substring(0, 60), href: href.substring(0, 150) });
        }
      });

      const result = {
        key,
        linkText: link.text,
        url: link.url.substring(0, 150),
        title,
        contentSize: bodyText.length,
        headings: [...new Set(headings)].slice(0, 5),
        tables: tables.length,
        tablePreview: tables.length > 0 ? tables[0].slice(0, 3) : [],
        downloads,
        forms: forms.length,
        formDetails: forms.slice(0, 2),
        subLinks: [...new Map(subLinks.map(s => [s.href, s])).values()].slice(0, 10),
        bodySnippet: bodyText.substring(0, 400),
      };

      crawlResults.push(result);
      process.stdout.write(` ✅ ${bodyText.length} chars, ${tables.length} tables, ${downloads.length} downloads\n`);

      // Small delay to be nice to the server
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      process.stdout.write(` ❌ ${err.message.substring(0, 50)}\n`);
    }
  }

  // ═══════════════════════════════════════════════
  // Final Report
  // ═══════════════════════════════════════════════
  console.log('\n\n' + '═'.repeat(80));
  console.log('🔓 ERP UNLOCKED — DISCOVERY REPORT');
  console.log('═'.repeat(80));

  crawlResults.forEach(r => {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📄 "${r.linkText}" — ${r.title}`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Content: ${r.contentSize} chars | Tables: ${r.tables} | Downloads: ${r.downloads.length} | Forms: ${r.forms}`);

    if (r.headings.length > 0) {
      console.log(`   📌 Headings: ${r.headings.join(' | ')}`);
    }

    if (r.tablePreview.length > 0) {
      console.log(`   📊 Table preview:`);
      r.tablePreview.forEach(row => console.log(`      ${row.join(' | ')}`));
    }

    if (r.downloads.length > 0) {
      console.log(`   📥 Downloads:`);
      r.downloads.forEach(d => console.log(`      "${d.text}" → ${d.href}`));
    }

    if (r.formDetails.length > 0) {
      console.log(`   📝 Forms:`);
      r.formDetails.forEach(f => console.log(`      ${f.method} ${f.action} | Inputs: ${f.inputs.join(', ')}`));
    }

    if (r.subLinks.length > 0) {
      console.log(`   🔗 Sub-links (deeper pages):`);
      r.subLinks.forEach(s => console.log(`      "${s.text}" → ${s.href}`));
    }

    console.log(`   📝 Snippet: "${r.bodySnippet.substring(0, 200)}..."`);
  });

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📊 TOTAL: ${crawlResults.length} live pages discovered`);
  console.log('═'.repeat(80));
}

probe().catch(err => {
  console.error('❌ Fatal error:', err.message);
});
