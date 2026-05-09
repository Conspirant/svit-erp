import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';
import { cookies } from 'next/headers';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';

const cleanText = (value) => value?.replace(/\s+/g, ' ').trim() || '';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cookieStrings = [];

    cookieStore.getAll().forEach((cookie) => {
      if (cookie.name !== 'dashboard_url') {
        cookieStrings.push(`${cookie.name}=${cookie.value}`);
      }
    });

    const sessionCookie = cookieStrings.join('; ');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await axios.get(`${BASE_URL}?option=com_bvbsims&controller=academiccal&task=calenderdisplay&yearId=`, {
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': sessionCookie,
      },
    });

    const $ = cheerio.load(res.data);

    // Check if logged out
    if ($('input[name="username"]').length > 0 && res.data.includes('Login')) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const eventsData = [];

    // Parse each month table. ERP sometimes uses an uk-grid attribute instead of a .uk-grid class.
    $('.cn-coe-table').each((i, tableEl) => {
      const table = $(tableEl);
      const monthTitle = cleanText(table.find('caption span').text() || table.find('caption').text());
      if (!monthTitle) return;

      const monthGrid = table.closest('.uk-grid, [uk-grid]');
      const eventScope = monthGrid.length > 0 ? monthGrid : table.parent().parent();
      const events = eventScope
        .find('.events-lists')
        .map((j, ev) => cleanText($(ev).text()))
        .get()
        .filter(Boolean);

      const days = [];
      table.find('tbody tr').each((rowIndex, row) => {
        $(row).find('td').each((columnIndex, td) => {
          const text = cleanText($(td).text());
          if (!text) {
            days.push({ day: '', type: 'empty', column: columnIndex });
            return;
          }

          let type = 'normal';
          if ($(td).find('.cn-holiday').length > 0) type = 'holiday';
          else if ($(td).find('.cn-minor-exam').length > 0) type = 'exam';

          days.push({ day: text, type, column: columnIndex });
        });
      });

      eventsData.push({
        month: monthTitle,
        events,
        days
      });
    });

    return NextResponse.json({ success: true, data: eventsData });

  } catch (error) {
    console.error('Events Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch events data' }, { status: 500 });
  }
}
