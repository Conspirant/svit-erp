const axios = require('axios');
const cheerio = require('cheerio');

async function parseSections() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    const profile = {};

    // 1. Basic details (Name, HOD designation, etc.)
    profile.name = $('h1').first().text().trim() || $('#list_panel_personal').find('h2, h3, h4').first().text().trim();
    
    // 2. Citations / H-Index
    profile.citations = [];
    $('.Cell-citation').each((i, el) => {
      profile.citations.push($(el).text().trim().replace(/\s+/g, ' '));
    });

    // 3. Qualifications
    profile.qualifications = [];
    $('#qualification-view, .qualification-view').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text) profile.qualifications.push(text);
    });

    // 4. Experience
    profile.experiences = [];
    $('#edit-experience-view, .edit-experience-view').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text) profile.experiences.push(text);
    });

    // 5. Expertise
    profile.expertise = [];
    $('#expertise-view span, #expertise-view strong, #e_expertise, #e_s_expertise').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !profile.expertise.includes(text)) profile.expertise.push(text);
    });
    if (profile.expertise.length === 0) {
      const text = $('#expertise-view').text().trim().replace(/\s+/g, ' ');
      if (text) profile.expertise.push(text);
    }

    // 6. Awards
    profile.awards = [];
    $('#four_awards .award-view, #list-awards .award-view, #awards-form-view .award-view').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !profile.awards.includes(text)) profile.awards.push(text);
    });

    // 7. Research Projects
    profile.projects = [];
    $('#three-rp .rp-view, #list-rp .rp-view, #rp-form-view .rp-view').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !profile.projects.includes(text)) {
        // Also look for funding info
        const agencyText = $(el).next('h5').text().trim().replace(/\s+/g, ' ');
        profile.projects.push({
          title: text,
          funding: agencyText || ''
        });
      }
    });

    // 8. Patents
    profile.patents = [];
    $('#three-pt .pt-view, #list-pt .pt-view, #pt-form-view .pt-view').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !profile.patents.includes(text)) profile.patents.push(text);
    });

    // 9. Professional Memberships
    profile.memberships = [];
    $('#three-pb .pb-view, #list-pb .pb-view, #pb-form-view .pb-view').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !profile.memberships.includes(text)) profile.memberships.push(text);
    });

    console.log('--- PARSED IRINS PROFILE ---');
    console.log(JSON.stringify(profile, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

parseSections();
