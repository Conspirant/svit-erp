const axios = require('axios');
const cheerio = require('cheerio');

async function testVal() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    console.log('Nagashree N current_page value:', $('#current_page').val());
    console.log('Nagashree N total_publication_count value:', $('#total_publication_count').val());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVal();
