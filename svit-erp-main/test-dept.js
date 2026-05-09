
const https = require('https');
const options = {
  hostname: 'svit-students.accredia.in',
  port: 8084,
  path: '/index.php?option=com_studentdashboard&controller=studentdashboard&task=dashboard',
  method: 'GET',
  headers: {
    'Cookie': '5bd4aa82278a9392700cda732bf3f9eb=bbc6c86b951e6c81f2467d86a93495a1'
  },
  rejectUnauthorized: false
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const cheerio = require('./node_modules/cheerio');
    const $ = cheerio.load(data);
    const fullPageText = $('body').text().replace(/\s+/g, ' ');
    const deptIndex = fullPageText.toLowerCase().indexOf('department');
    console.log('--- DEPT DEBUG ---', fullPageText.substring(Math.max(0, deptIndex - 20), deptIndex + 150));
  });
});
req.on('error', (e) => { console.error(e); });
req.end();

