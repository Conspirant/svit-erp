const axios = require('axios');
const cheerio = require('cheerio');

async function inspectPadmaHtml() {
  const url = 'https://saividya.irins.org/profile/203880';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);

    // Let's dump all inputs
    console.log('--- ALL INPUT VALUES ---');
    $('input').each((i, el) => {
      console.log(`Input: name="${$(el).attr('name')}", id="${$(el).attr('id')}", value="${$(el).val()}"`);
    });

    // Let's see if there is any HTML inside #publication_div
    console.log('\n--- check #publication_div ---');
    console.log('publication_div exists:', $('#publication_div').length > 0);
    console.log('publication_div html length:', $('#publication_div').html().trim().length);

    // Let's find any list elements or funny-boxes that contain publication information
    console.log('\n--- checking for any funny-boxes or publication items in the raw HTML ---');
    $('.funny-boxes').each((i, el) => {
      console.log(`Funny box [${i}]: "${$(el).text().trim().substring(0, 150).replace(/\s+/g, ' ')}"`);
    });

    // Let's print out the text or headers at the bottom
    console.log('\n--- Printing text around "Publications" ---');
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.startsWith('Publications (') && text.length < 50) {
        console.log(`Tag: ${el.name}, Class: "${$(el).attr('class') || ''}", Text: "${text}"`);
        console.log('Parent HTML snippet:', $(el).parent().html().trim().substring(0, 1000).replace(/\s+/g, ' '));
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

inspectPadmaHtml();
