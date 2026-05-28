const axios = require('axios');
const cheerio = require('cheerio');

async function checkPadmaProfile() {
  const url = 'https://saividya.irins.org/profile/203880';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    
    console.log('--- PROFILE HEADINGS ---');
    $('h1, h2, h3, h4, h5, h6, .panel-title').each((i, el) => {
      console.log(`${el.name}: "${$(el).text().trim().replace(/\s+/g, ' ')}"`);
    });

    console.log('\n--- TARGETS CHECK ---');
    console.log('total_publication_count text:', $('#total_publication_count').text().trim());
    console.log('current_page value:', $('#current_page').val());
    console.log('expert_id value:', $('#expert_id').val());

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPadmaProfile();
