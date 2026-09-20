const axios = require('axios');
const cheerio = require('cheerio');

const BRANCH_TO_SLUG = {
  "CS": "computer-science-and-engineering",
  "CD": "data-science",
  "EC": "electronics-and-communication-engineering",
  "ME": "mechanical-engineering",
  "CV": "civil-engineering",
  "IS": "information-science-and-engineering",
  "AI": "artificial-intelligence-and-machine-learning",
  "CI": "artificial-intelligence-and-machine-learning",
  "CSE": "computer-science-and-engineering",
  "CSE(DS)": "data-science",
  "CSE(AI&ML)": "artificial-intelligence-and-machine-learning",
  "MBA": "master-of-business-administration",
  "CHEMISTRY": "chemistry",
  "PHYSICS": "physics",
  "MATHEMATICS": "mathematics",
};

function getSlugFromDept(dept) {
  if (!dept) return BRANCH_TO_SLUG["CS"];
  let normalized = dept.toUpperCase().trim();
  if (normalized.startsWith("B.E-")) normalized = normalized.replace("B.E-", "");
  if (normalized.startsWith("B.E ")) normalized = normalized.replace("B.E ", "");
  
  if (BRANCH_TO_SLUG[normalized]) {
    return BRANCH_TO_SLUG[normalized];
  }
  
  // Resilient text searches
  if (normalized.includes("DATA SCIENCE") || normalized.includes("DS")) return "data-science";
  if (normalized.includes("ARTIFICIAL") || normalized.includes("AIML") || normalized.includes("A.I") || normalized.includes("MACHINE")) {
    return "artificial-intelligence-and-machine-learning";
  }
  if (normalized.includes("COMPUTER") || normalized.includes("CSE") || normalized.includes("CS")) return "computer-science-and-engineering";
  if (normalized.includes("INFORMATION") || normalized.includes("ISE") || normalized.includes("IS")) return "information-science-and-engineering";
  if (normalized.includes("ELECTRONICS") || normalized.includes("ECE") || normalized.includes("EC")) return "electronics-and-communication-engineering";
  if (normalized.includes("CIVIL") || normalized.includes("CV")) return "civil-engineering";
  if (normalized.includes("MECHANICAL") || normalized.includes("ME")) return "mechanical-engineering";
  if (normalized.includes("BUSINESS") || normalized.includes("MBA")) return "master-of-business-administration";
  if (normalized.includes("CHEMISTRY")) return "chemistry";
  if (normalized.includes("PHYSICS")) return "physics";
  if (normalized.includes("MATH")) return "mathematics";

  return "computer-science-and-engineering"; // Fallback default
}

async function scrapeFacultyList(slug) {
  const url = `https://saividya.ac.in/faculty/${slug}`;
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });
    const $ = cheerio.load(res.data);
    const facultyList = [];

    $('.event-speaker__details').each((i, el) => {
      const imgEl = $(el).find('.speaker-thumb img');
      let image = imgEl.attr('src') || '';
      
      // Make image URL absolute
      if (image && !image.startsWith('http')) {
        image = `https://saividya.ac.in/${image.startsWith('/') ? image.substring(1) : image}`;
      }

      const name = $(el).find('h5.speaker__name').text().trim();
      const designation = $(el).find('span.designation').text().trim();
      
      // Find LinkedIn link
      let linkedin = '';
      $(el).find('.speaker-social-link a').each((j, aEl) => {
        const href = $(aEl).attr('href') || '';
        if (href.includes('linkedin.com')) {
          linkedin = href;
        }
      });

      // Find IRINS Profile URL & expertId
      let irinsUrl = '';
      let expertId = '';
      $(el).find('a').each((j, aEl) => {
        const href = $(aEl).attr('href') || '';
        if (href.includes('irins.org')) {
          irinsUrl = href;
          const match = href.match(/\/profile\/(\d+)/);
          if (match) {
            expertId = match[1];
          }
        }
      });

      if (name) {
        facultyList.push({
          name,
          designation,
          image: image || 'https://saividya.ac.in/assets/images/faculty/empty.jpg',
          linkedin,
          irinsUrl,
          expertId
        });
      }
    });

    return facultyList;
  } catch (error) {
    console.error(`Error scraping faculty list for slug ${slug}:`, error.message);
    throw new Error(`Failed to scrape faculty list: ${error.message}`);
  }
}

async function fetchPublicationsPage(expertId, pageNum) {
  const url = 'https://saividya.irins.org/profile/get_publication';
  const params = new URLSearchParams();
  params.append('current_page', pageNum.toString());
  params.append('expert_id', expertId.toString());
  params.append('sort_by', '');
  params.append('direction', '');

  try {
    const res = await axios.post(url, params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 10000
    });

    if (res.status !== 200 || !res.data) return [];
    
    const $ = cheerio.load(res.data);
    const pagePubs = [];

    $('.funny-boxes').each((i, el) => {
      const title = $(el).find('h2').text().trim().replace(/\s+/g, ' ');
      const type = $(el).find('.label-info, .label').first().text().trim().replace(/\s+/g, ' ');
      const authors = $(el).find('.author').text().trim().replace(/\s+/g, ' ');
      
      const rowDiv = $(el).find('.row');
      let rowText = rowDiv.clone().children('h2, .author, .label-info, .label, script, style').remove().end().text().trim();
      rowText = rowText.replace(/\s+/g, ' ');
      
      const yearMatch = rowText.match(/Year\s*(\d{4})/i) || rowText.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[1] || yearMatch[0] : '';

      if (title) {
        pagePubs.push({
          title,
          type,
          authors,
          details: rowText,
          year
        });
      }
    });

    return pagePubs;
  } catch (error) {
    console.error(`Error fetching publications page ${pageNum} for expert ${expertId}:`, error.message);
    return [];
  }
}

async function scrapeFacultyProfile(expertId) {
  const url = `https://saividya.irins.org/profile/${expertId}`;
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    const $ = cheerio.load(res.data);
    const profile = {};

    // 1. Basic Details
    const nameEl = $('ul.name-location li h1').first();
    profile.name = nameEl.text().trim().replace(/\s+/g, ' ') || $('h1').first().text().trim().replace(/\s+/g, ' ');
    profile.designation = nameEl.parent().next('li').text().trim().replace(/\s+/g, ' ');
    profile.organization = nameEl.parent().next('li').next('li').text().trim().replace(/\s+/g, ' ');

    // 2. Citations / H-Index
    profile.citations = [];
    $('.Cell-citation').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text) profile.citations.push(text);
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
      const year = $(el).find('.date-formats span').text().trim().replace(/\s+/g, ' ');
      const title = $(el).find('.heading-xs').text().trim().replace(/\s+/g, ' ');
      const body = $(el).find('p').text().trim().replace(/\s+/g, ' ');
      if (title) {
        profile.awards.push({ year, title, description: body });
      }
    });

    // 7. Research Projects
    profile.projects = [];
    $('#rp-form-view #rp-view, #three-rp #rp-view, #list-rp #rp-view').each((i, el) => {
      const title = $(el).find('h2').text().trim().replace(/\s+/g, ' ');
      const funding = $(el).find('h5').text().trim().replace(/\s+/g, ' ');
      const details = [];
      $(el).find('.share-list li').each((j, li) => {
        const liTxt = $(li).text().trim().replace(/\s+/g, ' ');
        if (liTxt) details.push(liTxt);
      });
      if (title) {
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
      let title = '';
      let authors = '';
      
      $(el).find('h2, h5').each((j, header) => {
        const text = $(header).text().trim().replace(/\s+/g, ' ');
        if ($(header).find('.fa-user, .color-green').length > 0 || text.includes('Dr.') || text.includes('Prof.')) {
          authors = text;
        } else if (text) {
          title = text;
        }
      });
      
      if (title.startsWith(':')) {
        title = title.substring(1).trim();
      }
      
      const details = [];
      $(el).find('.share-list li').each((j, li) => {
        const liTxt = $(li).text().trim().replace(/\s+/g, ' ');
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
      const year = $(el).find('.profile-post-numb').text().trim().replace(/\s+/g, ' ');
      const title = $(el).find('.heading-xs').text().trim().replace(/\s+/g, ' ');
      const type = $(el).find('p').text().trim().replace(/\s+/g, ' ');
      if (title) {
        profile.memberships.push({ year, title, type });
      }
    });

    // 10. Publications (fetch up to 5 pages for efficiency, starting from page 0)
    profile.publications = [];
    let page = 0;
    let hasMore = true;
    while (hasMore && page <= 4) {
      const pubs = await fetchPublicationsPage(expertId, page);
      if (pubs && pubs.length > 0) {
        profile.publications.push(...pubs);
        page++;
      } else {
        hasMore = false;
      }
    }

    return profile;
  } catch (error) {
    console.error(`Error scraping IRINS profile for expertId ${expertId}:`, error.message);
    throw new Error(`Failed to scrape profile details: ${error.message}`);
  }
}

module.exports = {
  getSlugFromDept,
  scrapeFacultyList,
  scrapeFacultyProfile
};
