const axios = require('axios');
const cheerio = require('cheerio');

async function testLoadPubs() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const content = res.data;
    const index = content.indexOf('function load_publications');
    if (index !== -1) {
      console.log('--- FOUND function load_publications ---');
      console.log(content.substring(index, index + 1500));
    } else {
      console.log('Could not find function load_publications in HTML.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLoadPubs();
