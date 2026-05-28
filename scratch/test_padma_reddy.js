const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeFacultyProfile } = require('../src/lib/facultyScraper');

async function debugPadmaReddy() {
  const expertId = '203880';
  console.log('Debugging expertId:', expertId);
  try {
    const profile = await scrapeFacultyProfile(expertId);
    console.log('Parsed Profile Summary:');
    console.log('Name:', profile.name);
    console.log('Citations:', profile.citations);
    console.log('Publications count:', profile.publications ? profile.publications.length : 0);
    console.log('Projects count:', profile.projects ? profile.projects.length : 0);
    console.log('Patents count:', profile.patents ? profile.patents.length : 0);
    
    // Let's print out raw html check from get_publication
    console.log('\n--- Checking get_publication AJAX raw check ---');
    const url = 'https://saividya.irins.org/profile/get_publication';
    const params = new URLSearchParams();
    params.append('current_page', '1');
    params.append('expert_id', expertId);
    params.append('sort_by', '');
    params.append('direction', '');

    const res = await axios.post(url, params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    console.log('AJAX response status:', res.status);
    console.log('AJAX response length:', res.data ? res.data.length : 0);
    console.log('AJAX response snippet:', res.data ? res.data.substring(0, 500).replace(/\s+/g, ' ') : '');

  } catch (error) {
    console.error('Error debugging:', error.message);
  }
}

debugPadmaReddy();
