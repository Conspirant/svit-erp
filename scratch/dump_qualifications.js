const axios = require('axios');
const cheerio = require('cheerio');

async function dumpQualifications() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    console.log('--- QUALIFICATION HTML ---');
    console.log($('#qualification-view').html());
    console.log('--- EXPERIENCE HTML ---');
    console.log($('#edit-experience-view').html());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

dumpQualifications();
