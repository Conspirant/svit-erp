const axios = require('axios');
const cheerio = require('cheerio');

async function testFetchPubs() {
  const url = 'https://saividya.irins.org/profile/get_publication';
  const data = {
    current_page: '1',
    expert_id: '312552',
    sort_by: '',
    direction: ''
  };

  console.log('Posting to URL:', url);
  console.log('Data:', data);

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

    console.log('Status code:', res.status);
    console.log('Response content length:', res.data.length);
    
    const $ = cheerio.load(res.data);
    console.log('\n--- FIRST 3 PUBLICATIONS FOUND IN AJAX RESPONSE ---');
    
    $('div, li, p, span').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length > 50 && $(el).children().length === 0) {
        console.log(`- Element [${el.name}]: "${text.substring(0, 150)}"`);
      }
    });

    // Let's print out the raw HTML of the first publication block
    console.log('\n--- FIRST RAW HTML ELEMENT Snippet ---');
    const firstPub = $('div.funny-boxes').first();
    if (firstPub.length) {
      console.log(firstPub.html().trim().substring(0, 800).replace(/\s+/g, ' '));
    } else {
      // Maybe they don't use funny-boxes, let's see if we can find any class
      console.log('No div.funny-boxes found. First 1000 characters of response:');
      console.log(res.data.substring(0, 1000).replace(/\s+/g, ' '));
    }

  } catch (error) {
    console.error('Error fetching publications:', error.message);
  }
}

testFetchPubs();
