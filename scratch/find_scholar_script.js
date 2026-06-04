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
    
    // Look at all script tags that contain ajax or google
    console.log('--- SCRIPT TAGS CONTAINING SCHOLAR/AJAX ---');
    $('script').each((i, el) => {
      const html = $(el).html();
      if (html && (html.includes('google') || html.includes('get_') || html.includes('ajax') || html.includes('sidebar'))) {
        console.log(`Script ${i}:`);
        console.log(html.substring(0, 1000));
        console.log('==================================================');
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findScholarScript();
