const axios = require('axios');
const cheerio = require('cheerio');

async function checkDetails() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);

    console.log('--- AWARDS PANEL HTML ---');
    if ($('#awards-form-view').length) {
      console.log($('#awards-form-view').html().trim().substring(0, 1000).replace(/\s+/g, ' '));
    }

    console.log('\n--- PROJECTS PANEL HTML ---');
    if ($('#rp-form-view').length) {
      console.log($('#rp-form-view').html().trim().substring(0, 1000).replace(/\s+/g, ' '));
    }

    console.log('\n--- PATENTS PANEL HTML ---');
    if ($('#pt-form-view').length) {
      console.log($('#pt-form-view').html().trim().substring(0, 1000).replace(/\s+/g, ' '));
    }

    console.log('\n--- PROFESSIONAL BODIES PANEL HTML ---');
    if ($('#pb-form-view').length) {
      console.log($('#pb-form-view').html().trim().substring(0, 1000).replace(/\s+/g, ' '));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDetails();
