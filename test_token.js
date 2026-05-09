const https = require('https');
const axios = require('axios');
const fs = require('fs');
const agent = new https.Agent({ rejectUnauthorized: false });

axios.get('https://svit-students.accredia.in:8084/index.php', { httpsAgent: agent, responseType: 'arraybuffer' })
  .then(res => {
    const html = res.data.toString('utf8');
    const match = html.match(/name=\"return\" value=\"([^\"]+)\"/);
    if(match) {
      console.log('Return Token:', match[1]);
      console.log('Buffer:', Buffer.from(match[1]).toString('hex'));
    }
  })
  .catch(console.error);
