
const https = require('https');
const options = {
  hostname: 'svit-students.accredia.in',
  port: 8084,
  path: '/index.php',
  method: 'GET',
  rejectUnauthorized: false
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const cheerio = require('./node_modules/cheerio');
    const $ = cheerio.load(data);
    console.log('--- SCRIPTS ---');
    $('script').each((i, el) => {
        const text = $(el).text();
        if (text.includes('function check')) {
            console.log(text.substring(0, 2000));
        }
    });
  });
});
req.on('error', (e) => { console.error(e); });
req.end();

