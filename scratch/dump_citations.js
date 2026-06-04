const axios = require('axios');
const cheerio = require('cheerio');

async function dumpCitations() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    
    // Find all elements with class containing 'citation' or related to citations
    console.log('--- CITATION BLOCKS ---');
    $('table, div, td, th').each((i, el) => {
      const className = $(el).attr('class') || '';
      const id = $(el).attr('id') || '';
      if (className.includes('citation') || id.includes('citation') || className.includes('scopus') || className.includes('scholar')) {
        console.log(`Tag: ${el.name}, Class: "${className}", Id: "${id}"`);
        console.log($(el).html().trim().substring(0, 500).replace(/\s+/g, ' '));
        console.log('----------------------------------------------------');
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

dumpCitations();
