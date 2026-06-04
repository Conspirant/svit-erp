const axios = require('axios');

async function testGoogleCitation() {
  const url = 'https://saividya.irins.org/profile/getgooglecitation';
  const expertId = '312552';
  const params = new URLSearchParams();
  params.append('expert_id', expertId);

  try {
    const res = await axios.post(url, params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 10000
    });
    console.log('Google Citation Response:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('Error fetching Google Scholar citation:', error.message);
  }
}

testGoogleCitation();
