/**
 * ERP Endpoint Probe — Reverse-engineers hidden Accredia ERP pages
 * 
 * This script uses your authenticated session cookie to probe
 * every common Joomla component/task combination and reports which
 * ones return real data vs login pages vs 404s.
 * 
 * Usage: Run this while logged into the app (grab your PHPSESSID from browser devtools)
 *   node scratch/probe_erp_endpoints.js <YOUR_PHPSESSID_VALUE>
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const BASE = 'https://svit-students.accredia.in:8084/index.php';

// Known Accredia / BVB / Joomla ERP component names to probe
const COMPONENTS = [
  'com_studentdashboard',
  'com_fee',
  'com_bvbsims',
  'com_library',
  'com_hostel',
  'com_transport',
  'com_hallticket',
  'com_result',
  'com_results',
  'com_exam',
  'com_examination',
  'com_placement',
  'com_feedback',
  'com_assignment',
  'com_assignments',
  'com_notification',
  'com_notifications',
  'com_message',
  'com_messages',
  'com_certificates',
  'com_certificate',
  'com_report',
  'com_reports',
  'com_scholarship',
  'com_bonafide',
  'com_grievance',
  'com_elective',
  'com_course',
  'com_registration',
  'com_coursefeedback',
  'com_student',
  'com_marks',
  'com_internal',
  'com_internals',
  'com_cie',
  'com_attendance',
  'com_timetable',
  'com_syllabus',
  'com_notes',
  'com_faculty',
  'com_users',
  'com_user',
  'com_content',
  'com_ajax',
  'com_media',
  'com_contact',
];

// Known controller/task combos for com_bvbsims
const BVBSIMS_TASKS = [
  'attendencelist',
  'ciedetails',
  'calenderdisplay',
  'studentprofile',
  'studentinfo',
  'studentdetails',
  'hallticket',
  'examschedule',
  'marksheet',
  'marklist',
  'resultview',
  'feedbackform',
  'syllabus',
  'assignment',
  'library',
  'hostel',
  'fee',
  'feereceipt',
  'feepayment',
  'transport',
  'notification',
  'circulars',
  'notices',
  'noticeboard',
  'dashboard',
  'timetable',
  'scheme',
  'courseregistration',
  'electiveselection',
];

const BVBSIMS_CONTROLLERS = [
  'academiccal',
  'studentdashboard',
  'attendance',
  'cie',
  'exam',
  'result',
  'fee',
  'library',
  'hostel',
  'transport',
  'feedback',
  'hallticket',
  'placement',
  'notification',
  'assignment',
  'timetable',
  'student',
  'marks',
  'report',
  'syllabus',
  'noticeboard',
];

async function probe(sessionCookie) {
  const results = { live: [], login: [], error: [], empty: [] };

  const tryUrl = async (url, label) => {
    try {
      const res = await axios.get(url, {
        httpsAgent,
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': sessionCookie,
        },
        maxRedirects: 3,
        validateStatus: () => true,
      });

      const $ = cheerio.load(res.data || '');
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const isLoginPage = $('input[name="username"]').length > 0 || bodyText.includes('Login to Your Account');
      const title = $('title').text().trim();
      const contentLen = bodyText.length;

      if (res.status === 404 || contentLen < 50) {
        results.empty.push({ label, status: res.status, contentLen });
        return;
      }

      if (isLoginPage) {
        results.login.push({ label, title });
        return;
      }

      // It's a LIVE page with actual content!
      // Extract useful snippets
      const tables = $('table').length;
      const forms = $('form').length;
      const links = $('a').length;
      
      // Get headings for context
      const headings = [];
      $('h1, h2, h3, h4').each((i, el) => {
        const t = $(el).text().trim().replace(/\s+/g, ' ');
        if (t.length > 2 && t.length < 100 && !headings.includes(t)) headings.push(t);
      });

      // Check for downloadable links
      const downloads = [];
      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (href.match(/\.(pdf|doc|xls|csv|zip)/i) || text.match(/download|receipt|ticket|certificate/i)) {
          downloads.push({ text: text.substring(0, 60), href: href.substring(0, 120) });
        }
      });

      // Extract menu items / navigation links we haven't seen
      const menuLinks = [];
      $('a[href*="option=com_"], a[href*="task="]').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (text && href && !menuLinks.some(m => m.href === href)) {
          menuLinks.push({ text: text.substring(0, 60), href: href.substring(0, 150) });
        }
      });

      results.live.push({ 
        label, 
        status: res.status,
        title,
        contentLen,
        tables, 
        forms, 
        links,
        headings: headings.slice(0, 8),
        downloads: downloads.slice(0, 5),
        menuLinks: menuLinks.slice(0, 10),
        bodySnippet: bodyText.substring(0, 300),
      });

    } catch (err) {
      results.error.push({ label, error: err.message });
    }
  };

  // Phase 1: Probe all component names
  console.log('🔍 Phase 1: Probing component names...\n');
  for (const comp of COMPONENTS) {
    const url = `${BASE}?option=${comp}`;
    process.stdout.write(`  Probing ${comp}...`);
    await tryUrl(url, comp);
    process.stdout.write(' done\n');
  }

  // Phase 2: Probe com_bvbsims with different controllers & tasks
  console.log('\n🔍 Phase 2: Probing com_bvbsims controller/task combos...\n');
  for (const ctrl of BVBSIMS_CONTROLLERS) {
    for (const task of BVBSIMS_TASKS.slice(0, 8)) { // Limit combos
      const url = `${BASE}?option=com_bvbsims&controller=${ctrl}&task=${task}`;
      const label = `bvbsims/${ctrl}/${task}`;
      process.stdout.write(`  Probing ${label}...`);
      await tryUrl(url, label);
      process.stdout.write(' done\n');
    }
  }

  // Phase 3: Probe com_studentdashboard with various tasks
  console.log('\n🔍 Phase 3: Probing com_studentdashboard tasks...\n');
  const dashTasks = ['dashboard', 'profile', 'attendance', 'marks', 'cie', 'fee', 'hallticket', 'result', 'timetable', 'feedback', 'notification', 'circular', 'noticeboard', 'feepayment', 'feereceipt', 'certificate', 'bonafide'];
  for (const task of dashTasks) {
    const url = `${BASE}?option=com_studentdashboard&controller=studentdashboard&task=${task}`;
    const label = `studentdashboard/${task}`;
    process.stdout.write(`  Probing ${label}...`);
    await tryUrl(url, label);
    process.stdout.write(' done\n');
  }

  // Results
  console.log('\n\n' + '='.repeat(80));
  console.log('🟢 LIVE PAGES (authenticated content found):');
  console.log('='.repeat(80));
  
  results.live.forEach(r => {
    console.log(`\n📄 ${r.label}`);
    console.log(`   Title: "${r.title}" | Status: ${r.status} | Size: ${r.contentLen} chars`);
    console.log(`   Tables: ${r.tables} | Forms: ${r.forms} | Links: ${r.links}`);
    if (r.headings.length) console.log(`   Headings: ${r.headings.join(' | ')}`);
    if (r.downloads.length) console.log(`   📥 Downloads: ${JSON.stringify(r.downloads)}`);
    if (r.menuLinks.length) console.log(`   🔗 Menu Links: ${JSON.stringify(r.menuLinks)}`);
    console.log(`   Snippet: "${r.bodySnippet.substring(0, 200)}..."`);
  });

  console.log(`\n\n🔴 LOGIN PAGES (${results.login.length}): ${results.login.map(r => r.label).join(', ')}`);
  console.log(`⚫ EMPTY/404 (${results.empty.length}): ${results.empty.map(r => r.label).join(', ')}`);
  console.log(`❌ ERRORS (${results.error.length}): ${results.error.map(r => `${r.label}(${r.error})`).join(', ')}`);
  
  console.log(`\n\n📊 Summary: ${results.live.length} live pages | ${results.login.length} login walls | ${results.empty.length} empty | ${results.error.length} errors`);
}

// Get session cookie from CLI argument or instructions
const sessionArg = process.argv[2];
if (!sessionArg) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ERP Endpoint Probe — Reverse Engineering Tool              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage:                                                      ║
║    node scratch/probe_erp_endpoints.js <PHPSESSID_VALUE>     ║
║                                                              ║
║  How to get your PHPSESSID:                                  ║
║    1. Open the SVIT ERP app in your browser                  ║
║    2. Log in normally                                        ║
║    3. Open DevTools (F12) → Application → Cookies            ║
║    4. Copy the value of the cookie (not the name)            ║
║    5. Pass it as the argument                                ║
║                                                              ║
║  Example:                                                    ║
║    node scratch/probe_erp_endpoints.js "abc123def456=xyz"    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

  // Alternative: try to read from the running app's cookies
  console.log('Attempting to probe WITHOUT session (will show which pages are public)...\n');
  probe('').catch(console.error);
} else {
  // The user might pass just the value or "name=value" pairs
  const cookie = sessionArg.includes('=') ? sessionArg : `PHPSESSID=${sessionArg}`;
  console.log(`Using session cookie: ${cookie.substring(0, 30)}...`);
  probe(cookie).catch(console.error);
}
