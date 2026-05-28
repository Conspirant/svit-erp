const axios = require('axios');
const cheerio = require('cheerio');

async function testParsePubs() {
  const url = 'https://saividya.irins.org/profile/get_publication';
  const data = {
    current_page: '1',
    expert_id: '312552',
    sort_by: '',
    direction: ''
  };

  try {
    const params = new URLSearchParams();
    for (const key in data) {
      params.append(key, data[key]);
    }

    const res = await axios.post(url, params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 10000
    });

    const $ = cheerio.load(res.data);
    const publications = [];

    $('.funny-boxes').each((i, el) => {
      const title = $(el).find('h2').text().trim();
      const type = $(el).find('.label-info, .label').first().text().trim();
      const authors = $(el).find('.author').text().trim();
      
      // Let's get the text inside the div.row that specifies journal/year, excluding tags
      const rowDiv = $(el).find('.row');
      let rowText = rowDiv.clone().children('h2, .author, .label-info, .label, script, style').remove().end().text().trim();
      rowText = rowText.replace(/\s+/g, ' ');
      
      // Extract year
      const yearMatch = rowText.match(/Year\s*(\d{4})/i) || rowText.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[1] || yearMatch[0] : '';

      publications.push({
        title,
        type,
        authors,
        details: rowText,
        year
      });
    });

    console.log(`Parsed ${publications.length} publications:`);
    publications.slice(0, 5).forEach((p, idx) => {
      console.log(`\nPublication [${idx + 1}]:`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Type: ${p.type}`);
      console.log(`  Authors: ${p.authors}`);
      console.log(`  Details: ${p.details}`);
      console.log(`  Year: ${p.year}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testParsePubs();
