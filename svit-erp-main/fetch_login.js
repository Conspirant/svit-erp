const https = require('https');
const axios = require('axios');
const fs = require('fs');
const agent = new https.Agent({ rejectUnauthorized: false });

axios.get('https://svit-students.accredia.in:8084/index.php', { httpsAgent: agent })
  .then(res => {
    fs.writeFileSync('login_page.html', res.data);
    console.log('Saved to login_page.html');
  })
  .catch(console.error);
