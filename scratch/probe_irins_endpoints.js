/**
 * IRINS API Probe — Discovers hidden IRINS endpoints beyond publications
 * 
 * The IRINS system at saividya.irins.org has AJAX endpoints like:
 *   - /profile/get_publication (known)
 *   - /profile/getgooglecitation (known)
 * 
 * This script probes for OTHER hidden AJAX endpoints that might expose
 * additional data like teaching history, student feedback, courses taught, etc.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const IRINS_BASE = 'https://saividya.irins.org';
const TEST_EXPERT_ID = '312552'; // Known working expertId

// IRINS endpoints to probe (common patterns in IRINS/Vidwan systems)
const AJAX_ENDPOINTS = [
  // Known working
  { path: '/profile/get_publication', method: 'POST' },
  { path: '/profile/getgooglecitation', method: 'POST' },
  
  // Likely candidates — IRINS/Vidwan typically have these
  { path: '/profile/get_patent', method: 'POST' },
  { path: '/profile/get_patents', method: 'POST' },
  { path: '/profile/get_project', method: 'POST' },
  { path: '/profile/get_projects', method: 'POST' },
  { path: '/profile/get_award', method: 'POST' },
  { path: '/profile/get_awards', method: 'POST' },
  { path: '/profile/get_experience', method: 'POST' },
  { path: '/profile/get_qualification', method: 'POST' },
  { path: '/profile/get_expertise', method: 'POST' },
  { path: '/profile/get_membership', method: 'POST' },
  { path: '/profile/get_citation', method: 'POST' },
  { path: '/profile/get_citations', method: 'POST' },
  { path: '/profile/get_scopuscitation', method: 'POST' },
  { path: '/profile/getscopuscitation', method: 'POST' },
  { path: '/profile/get_woscitation', method: 'POST' },
  { path: '/profile/getwoscitation', method: 'POST' },
  { path: '/profile/get_teaching', method: 'POST' },
  { path: '/profile/get_courses', method: 'POST' },
  { path: '/profile/get_thesis', method: 'POST' },
  { path: '/profile/get_book', method: 'POST' },
  { path: '/profile/get_books', method: 'POST' },
  { path: '/profile/get_chapter', method: 'POST' },
  { path: '/profile/get_conference', method: 'POST' },
  { path: '/profile/get_journal', method: 'POST' },
  { path: '/profile/get_invited_talk', method: 'POST' },
  { path: '/profile/get_invited_talks', method: 'POST' },
  { path: '/profile/get_guidance', method: 'POST' },
  { path: '/profile/get_phd_guidance', method: 'POST' },
  { path: '/profile/get_student', method: 'POST' },
  { path: '/profile/get_collaboration', method: 'POST' },
  { path: '/profile/get_activity', method: 'POST' },
  { path: '/profile/get_fdp', method: 'POST' },
  { path: '/profile/get_workshop', method: 'POST' },
  { path: '/profile/get_seminar', method: 'POST' },
  { path: '/profile/get_event', method: 'POST' },
  { path: '/profile/get_consultancy', method: 'POST' },
  { path: '/profile/get_outreach', method: 'POST' },
  { path: '/profile/get_ipr', method: 'POST' },
  { path: '/profile/get_copyright', method: 'POST' },
  
  // GET endpoints
  { path: `/profile/${TEST_EXPERT_ID}/publications`, method: 'GET' },
  { path: `/profile/${TEST_EXPERT_ID}/patents`, method: 'GET' },
  { path: `/profile/${TEST_EXPERT_ID}/projects`, method: 'GET' },
  { path: `/profile/${TEST_EXPERT_ID}/awards`, method: 'GET' },
  { path: `/profile/${TEST_EXPERT_ID}/cv`, method: 'GET' },
  { path: `/profile/${TEST_EXPERT_ID}/resume`, method: 'GET' },
  
  // API-style endpoints
  { path: '/api/profile', method: 'POST' },
  { path: '/api/faculty', method: 'GET' },
  { path: '/api/search', method: 'GET' },
  { path: '/search', method: 'GET' },
  { path: '/faculty', method: 'GET' },
  { path: '/api/publication', method: 'POST' },
];

// Also probe the main IRINS profile page for hidden AJAX URLs in the source
async function extractHiddenAjaxUrls() {
  console.log('🔍 Phase 0: Extracting AJAX URLs from profile page source...\n');
  
  try {
    const res = await axios.get(`${IRINS_BASE}/profile/${TEST_EXPERT_ID}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });

    const html = res.data;
    
    // Find all AJAX URLs in JavaScript code
    const ajaxMatches = html.match(/(?:url|ajax|fetch|href)\s*[:=]\s*['"`]([^'"`]+?)['"`]/gi) || [];
    const uniqueUrls = new Set();
    
    ajaxMatches.forEach(match => {
      const urlMatch = match.match(/['"`]([^'"`]+?)['"`]/);
      if (urlMatch) {
        const url = urlMatch[1];
        if (url.startsWith('/') || url.includes('irins') || url.includes('profile')) {
          uniqueUrls.add(url);
        }
      }
    });

    // Also find function calls that might reveal endpoints
    const funcMatches = html.match(/\$\.(?:ajax|post|get)\s*\(\s*['"`]([^'"`]+?)['"`]/gi) || [];
    funcMatches.forEach(match => {
      const urlMatch = match.match(/['"`]([^'"`]+?)['"`]/);
      if (urlMatch) uniqueUrls.add(urlMatch[1]);
    });

    // Search for any URL patterns in script blocks
    const $ = cheerio.load(html);
    $('script').each((i, el) => {
      const scriptText = $(el).html() || '';
      const urlMatches = scriptText.match(/['"`](\/[a-z_/]+)['"`]/gi) || [];
      urlMatches.forEach(m => {
        const clean = m.replace(/['"`]/g, '');
        if (clean.length > 3 && clean.length < 80 && !clean.includes('.js') && !clean.includes('.css')) {
          uniqueUrls.add(clean);
        }
      });
    });

    console.log('   Found URLs in page source:');
    [...uniqueUrls].sort().forEach(url => console.log(`   📌 ${url}`));
    console.log(`\n   Total: ${uniqueUrls.size} unique URLs found in source\n`);
    
    return [...uniqueUrls];
  } catch (err) {
    console.error('   Error extracting:', err.message);
    return [];
  }
}

async function probeEndpoints() {
  const discovered = await extractHiddenAjaxUrls();
  
  // Add discovered URLs to our probe list
  discovered.forEach(url => {
    if (!AJAX_ENDPOINTS.some(e => e.path === url)) {
      AJAX_ENDPOINTS.push({ path: url, method: 'POST' });
    }
  });

  console.log('🔍 Phase 1: Probing AJAX endpoints...\n');
  
  const live = [];
  const dead = [];

  for (const endpoint of AJAX_ENDPOINTS) {
    const url = endpoint.path.startsWith('http') ? endpoint.path : `${IRINS_BASE}${endpoint.path}`;
    process.stdout.write(`  ${endpoint.method} ${endpoint.path}...`);
    
    try {
      const params = new URLSearchParams();
      params.append('expert_id', TEST_EXPERT_ID);
      params.append('current_page', '0');
      
      const config = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 8000,
        validateStatus: () => true,
      };

      let res;
      if (endpoint.method === 'POST') {
        res = await axios.post(url, params.toString(), config);
      } else {
        res = await axios.get(url, config);
      }

      const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const isHtml = data.includes('<') && data.includes('>');
      const hasContent = data.length > 10 && !data.includes('404') && !data.includes('error');

      if (res.status === 200 && hasContent) {
        const snippet = data.substring(0, 200).replace(/\s+/g, ' ').trim();
        live.push({ path: endpoint.path, method: endpoint.method, size: data.length, isHtml, snippet });
        process.stdout.write(` ✅ ${data.length} bytes\n`);
      } else {
        dead.push({ path: endpoint.path, status: res.status });
        process.stdout.write(` ❌ ${res.status}\n`);
      }
    } catch (err) {
      dead.push({ path: endpoint.path, error: err.message });
      process.stdout.write(` ❌ ${err.message.substring(0, 40)}\n`);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('🟢 LIVE IRINS ENDPOINTS:');
  console.log('='.repeat(80));
  
  live.forEach(r => {
    console.log(`\n  ✅ ${r.method} ${r.path}`);
    console.log(`     Size: ${r.size} bytes | HTML: ${r.isHtml}`);
    console.log(`     Snippet: "${r.snippet}"`);
  });

  console.log(`\n\n📊 Summary: ${live.length} live | ${dead.length} dead`);
}

probeEndpoints().catch(console.error);
