const axios = require('axios');
const cheerio = require('cheerio');

async function testPubPages() {
  const expertId = '203880';
  const pages = ['0', '1', '2'];
  
  for (const page of pages) {
    const url = 'https://saividya.irins.org/profile/get_publication';
    const params = new URLSearchParams();
    params.append('current_page', page);
    params.append('expert_id', expertId);
    params.append('sort_by', '');
    params.append('direction', '');

    try {
      const res = await axios.post(url, params.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      console.log(`Page [${page}] Response status:`, res.status);
      console.log(`Page [${page}] Response length:`, res.data ? res.data.length : 0);
      if (res.data && res.data.length > 5) {
        console.log(`Page [${page}] Snippet:`, res.data.substring(0, 300).replace(/\s+/g, ' '));
      }
    } catch (e) {
      console.error(`Page [${page}] error:`, e.message);
    }
  }
}

testPubPages();
