const axios = require('axios');
const cheerio = require('cheerio');

async function testPerfectParser() {
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
    
    // Designation and department
    const subTitle = $('.profile-details, .headline').text().trim().replace(/\s+/g, ' ');
    // We can also extract from header block
    const deptInfo = $('span:contains("Sai Vidya Institute of Technology")').first().parent().text().trim().replace(/\s+/g, ' ');
    
    profile.departmentInfo = deptInfo;

    // 2. Citations / H-Index
    profile.citations = [];
    $('.Cell-citation').each((i, el) => {
      const txt = $(el).text().trim().replace(/\s+/g, ' ');
      if (txt) profile.citations.push(txt);
    });

    // 3. Qualifications
    profile.qualifications = [];
    $('#qualification-view li, #qualification-view .qualification-view, #qua-ul li').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !profile.qualifications.includes(text)) profile.qualifications.push(text);
    });

    // 4. Experience
    profile.experiences = [];
    $('#edit-experience-view li, #edit-experience-view .edit-experience-view, #exp-ul li').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !profile.experiences.includes(text)) profile.experiences.push(text);
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
    $('#awards-form-view .profile-event, #four_awards .profile-event, #list-awards .profile-event').each((i, el) => {
      const year = $(el).find('.date-formats span').text().trim();
      const title = $(el).find('.heading-xs').text().trim();
      const body = $(el).find('p').text().trim();
      
      const awardStr = [year, title, body].filter(Boolean).join(' - ');
      if (awardStr && !profile.awards.includes(awardStr)) {
        profile.awards.push({ year, title, description: body });
      }
    });

    // 7. Research Projects
    profile.projects = [];
    $('#rp-form-view #rp-view, #three-rp #rp-view, #list-rp #rp-view').each((i, el) => {
      const title = $(el).find('h2').text().trim();
      const funding = $(el).find('h5').text().trim().replace(/\s+/g, ' ');
      const details = [];
      $(el).find('.share-list li').each((j, li) => {
        const liTxt = $(li).text().trim();
        if (liTxt) details.push(liTxt);
      });
      
      if (title && !profile.projects.some(p => p.title === title)) {
        profile.projects.push({
          title,
          funding,
          details: details.join(' | ')
        });
      }
    });

    // 8. Patents
    profile.patents = [];
    $('#pt-form-view #pt-view, #three-pt #pt-view, #list-pt #pt-view').each((i, el) => {
      const title = $(el).find('h5').first().text().trim();
      const authors = $(el).find('h5').eq(1).text().trim();
      const details = [];
      $(el).find('.share-list li').each((j, li) => {
        const liTxt = $(li).text().trim();
        if (liTxt) details.push(liTxt);
      });

      if (title && !profile.patents.some(p => p.title === title)) {
        profile.patents.push({
          title,
          authors,
          details: details.join(' | ')
        });
      }
    });

    // 9. Professional Memberships
    profile.memberships = [];
    $('#pb-form-view .profile-post, #three-pb .profile-post, #list-pb .profile-post').each((i, el) => {
      const year = $(el).find('.profile-post-numb').text().trim();
      const title = $(el).find('.heading-xs').text().trim();
      const type = $(el).find('p').text().trim();

      if (title && !profile.memberships.some(m => m.title === title)) {
        profile.memberships.push({
          year,
          title,
          type
        });
      }
    });

    console.log('--- PARSED IRINS PROFILE ---');
    console.log(JSON.stringify(profile, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPerfectParser();
