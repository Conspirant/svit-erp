const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');
const agent = new https.Agent({ rejectUnauthorized: false });

async function testLogin() {
  const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';
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
  formData.append('username', '1SV20CS001');
  formData.append('password', '2000-01-01');
  formData.append('passwd', '2000-01-01');
  formData.append('yyyy', '');
  formData.append('mm', '');
  formData.append('dd', '');
  formData.append('option', 'com_user');
  formData.append('task', 'login');
  formData.append('return', returnToken);
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

  console.log('Status:', loginRes.status);
  console.log('Location:', loginRes.headers.location);
}

testLogin().catch(console.error);
