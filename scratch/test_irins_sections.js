const axios = require('axios');
const cheerio = require('cheerio');

async function testSections() {
  const url = 'https://saividya.irins.org/profile/312552';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);

    // Let's search for divs or panels matching headings
    const headings = ['Personal Information', 'Expertise', 'Experience', 'Education', 'Award', 'Patent', 'Project', 'Professional Bodies'];
    
    console.log('--- SEARCHING HEADINGS AND CONTAINERS ---');
    
    headings.forEach((heading) => {
      // Find elements containing the heading text
      console.log(`\n--- HEADING: "${heading}" ---`);
      $('*').each((i, el) => {
        const text = $(el).text().trim();
        if (text.toLowerCase().includes(heading.toLowerCase()) && text.length < 50 && $(el).children().length === 0) {
          console.log(`Tag: ${el.name}, Class: "${$(el).attr('class') || ''}", Text: "${text}"`);
          
          // Let's look at siblings or parent panels
          let parent = $(el).parent();
          while (parent.length) {
            const pClass = parent.attr('class') || '';
            if (pClass.includes('panel') || pClass.includes('box') || pClass.includes('row')) {
              console.log(`  Parent container class: "${pClass}", tag: "${parent[0].name}"`);
              // Let's print out the text snippet of this container
              const containerText = parent.text().trim().replace(/\s+/g, ' ');
              console.log(`    Content: "${containerText.substring(0, 300)}..."`);
              break;
            }
            parent = parent.parent();
          }
        }
      });
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSections();
