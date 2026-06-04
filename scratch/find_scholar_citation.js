const axios = require('axios');
const cheerio = require('cheerio');

async function findScholarScript() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    
    // Look at all script tags that contain google_scolar_citation
    console.log('--- SCRIPTS WITH google_scolar_citation ---');
    $('script').each((i, el) => {
      const html = $(el).html();
      if (html && html.includes('google_scolar_citation')) {
        console.log(html);
        console.log('==================================================');
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findScholarScript();
