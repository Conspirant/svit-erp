const axios = require('axios');
const cheerio = require('cheerio');

async function dumpHeaders() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);

    console.log('--- ALL HEADINGS ---');
    $('h1, h2, h3, h4, h5, h6, .panel-title, .title, .headline').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length > 0) {
        console.log(`Tag: ${el.name || $(el).attr('class')}, Text: "${text}"`);
      }
    });

    console.log('\n--- TABS/PANELS BY ID ---');
    $('[id]').each((i, el) => {
      const id = $(el).attr('id') || '';
      const text = $(el).text().trim().substring(0, 100).replace(/\s+/g, ' ');
      if (id && text) {
        console.log(`ID: "${id}", Text: "${text}"`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

dumpHeaders();
