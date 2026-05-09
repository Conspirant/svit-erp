const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');
const agent = new https.Agent({ rejectUnauthorized: false });

async function testDashboard() {
  const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';
  
  // 1. Get login page
  const initialRes = await axios.get(BASE_URL, { httpsAgent: agent });
  const cookiesArray = initialRes.headers['set-cookie'];
  const sessionCookie = cookiesArray ? cookiesArray.map(c => c.split(';')[0]).join('; ') : '';

  const $ = cheerio.load(initialRes.data);
  const formContainer = $('form').filter((i, el) => $(el).attr('id') === 'login-form' || $(el).find('input[name="username"]').length > 0).last();
  const returnToken = formContainer.find('input[name="return"]').first().val();
  
  let csrfTokenName = '';
  formContainer.find('input[type="hidden"][value="1"]').each((_, el) => {
    const name = $(el).attr('name');
    if (name && name.length === 32) csrfTokenName = name;
  });

  const formData = new URLSearchParams();
  formData.append('username', '1VA25CD092');
  formData.append('passwd', '2005-05-16');
  formData.append('yyyy', '2005');
  formData.append('mm', '05');
  formData.append('dd', '16 ');
  formData.append('option', 'com_user');
  formData.append('task', 'login');
  if (returnToken) formData.append('return', returnToken);
  formData.append(csrfTokenName, '1');

  const loginRes = await axios.post(BASE_URL, formData.toString(), {
    httpsAgent: agent,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionCookie,
      'Referer': BASE_URL,
    },
    maxRedirects: 0,
    validateStatus: () => true
  });

  const loginCookies = loginRes.headers['set-cookie'];
  const finalCookie = loginCookies ? loginCookies.map(c => c.split(';')[0]).join('; ') : sessionCookie;

  const dashboardUrl = loginRes.headers.location;
  console.log('Fetching Dashboard at:', dashboardUrl);

  const dashRes = await axios.get(dashboardUrl, {
    httpsAgent: agent,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': finalCookie,
    }
  });

  const dash$ = cheerio.load(dashRes.data);
  console.log('Dashboard Title:', dash$('title').text());
  console.log('Profile Name:', dash$('.cn-user-name, .profile-name, h3.profile-name, .user-name').first().text().trim());
  
  const fullPageText = dash$('body').text().replace(/\s+/g, ' ');
  const usnMatch = fullPageText.match(/USN\s*:\s*(1[a-z0-9]{9})/i) || fullPageText.match(/(1[a-z]{2}\d{2}[a-z]{2}\d{3})/i);
  console.log('Extracted USN:', usnMatch ? usnMatch[1] : 'Not found');
}

testDashboard().catch(console.error);
