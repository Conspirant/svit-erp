const axios = require('axios');
const cheerio = require('cheerio');

async function checkHeaderParent() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);

    console.log('--- H1 SIBLINGS & PARENTS ---');
    const h1 = $('h1').first();
    if (h1.length) {
      let parent = h1.parent();
      for (let i = 0; i < 3; i++) {
        console.log(`\nParent level ${i+1}: tag="${parent[0].name}", class="${parent.attr('class') || ''}", id="${parent.attr('id') || ''}"`);
        console.log(parent.html().trim().substring(0, 1000).replace(/\s+/g, ' '));
        parent = parent.parent();
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkHeaderParent();
