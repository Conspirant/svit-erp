const axios = require('axios');
const cheerio = require('cheerio');

const otherSlugs = [
  'mba',
  'master-of-business-administration',
  'business-administration',
  'management-studies'
];

async function testOtherSlugs() {
  for (const slug of otherSlugs) {
    const url = `https://saividya.ac.in/faculty/${slug}`;
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000
      });
      if (res.status === 200) {
        const $ = cheerio.load(res.data);
        const count = $('.event-speaker__details').length;
        console.log(`SLUG [${slug}]: Status 200, Found ${count} faculty members. Page Title: "${$('title').text().trim()}"`);
      }
    } catch (error) {
      // Ignore
    }
  }
}

testOtherSlugs();
