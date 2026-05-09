const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');
const agent = new https.Agent({ rejectUnauthorized: false });

async function testLogin() {
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

  // User details
  const username = '1VA25CD092';
  let dob = '16-05-2005';
  
  const dateMatch = dob.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
  if (dateMatch) {
    dob = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('passwd', dob);

  const parsedDate = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (parsedDate) {
     formData.append('yyyy', parsedDate[1]);
     formData.append('mm', parsedDate[2]);
     formData.append('dd', parsedDate[3] + ' '); // My updated code sends this space
  } else {
     formData.append('yyyy', '');
     formData.append('mm', '');
     formData.append('dd', '');
  }

  formData.append('option', 'com_user');
  formData.append('task', 'login');
  if (returnToken) formData.append('return', returnToken);
  formData.append(csrfTokenName, '1');

  console.log('Sending formData:', formData.toString());
  
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
  
  if (loginRes.status === 200) {
    const $err = cheerio.load(loginRes.data);
    console.log('Error Text:', $err('.alert-error, .uk-alert-danger').text().trim() || 'No explicit error text');
  }
}

testLogin().catch(console.error);
