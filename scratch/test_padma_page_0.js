const axios = require('axios');
const cheerio = require('cheerio');

async function testPage0() {
  const expertId = '203880';
  const url = 'https://saividya.irins.org/profile/get_publication';
  const params = new URLSearchParams();
  params.append('current_page', '0');
  params.append('expert_id', expertId);
  params.append('sort_by', '');
  params.append('direction', '');

  console.log('Sending request for Page 0 to', url);
  try {
    const res = await axios.post(url, params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 15000
    });
    console.log('Page 0 Status:', res.status);
    console.log('Page 0 Response length:', res.data ? res.data.length : 0);
    
    if (res.data) {
      const $ = cheerio.load(res.data);
      console.log('Found funny-boxes elements:', $('.funny-boxes').length);
      $('.funny-boxes').each((i, el) => {
        console.log(`Pub [${i}]: "${$(el).find('h2').text().trim()}"`);
      });
    }
  } catch (error) {
    console.error('Error fetching Page 0:', error.message);
  }
}

testPage0();
