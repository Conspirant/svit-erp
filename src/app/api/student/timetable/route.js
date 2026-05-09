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

export async function GET(request) {
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

    // Support week navigation via query params
    const { searchParams } = new URL(request.url);
    const weekType = searchParams.get('type'); // 'prev' or 'next'
    const prevStart = searchParams.get('prevstart');
    const prevEnd = searchParams.get('prevend');
    const nextStart = searchParams.get('nextstart');
    const nextEnd = searchParams.get('nextend');
    const j = searchParams.get('j');

    let url = `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=timetable`;

    if (weekType === 'prev' && prevStart && prevEnd) {
      url += `&j=${j || ''}&prevstart=${prevStart}&prevend=${prevEnd}&type=prev`;
    } else if (weekType === 'next' && nextStart && nextEnd) {
      url += `&j=${j || '1'}&nextstart=${nextStart}&nextend=${nextEnd}&type=next`;
    }

    const res = await axios.get(url, {
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': sessionCookie,
      },
    });

    const $ = cheerio.load(res.data);

    if ($('input[name="username"]').length > 0 && res.data.includes('Login')) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const timetable = [];
    const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    // The ERP structure: each day has its own <table> with a <caption> containing:
    //   "Timetable" text + <span>DayName</span> + <span>DD-MM-YYYY</span>
    // Table columns: Time | Course Code and Course Name | Faculty 1 Optional Faculty 2 | Room No | Batch
    //
    // There's also a large wrapper table (Table 0) that contains everything — skip it.
    // The real per-day tables have exactly 5 header columns.

    $('table').each((i, table) => {
      // Check for proper 5-column header
      const headerCells = [];
      $(table).find('thead tr th, tr:first-child th').each((j, th) => {
        headerCells.push(cleanText($(th).text()).toLowerCase());
      });

      // Must have exactly 5 columns with 'time' to be a real timetable table
      if (headerCells.length !== 5 || !headerCells[0].includes('time')) return;

      // Extract day and date from <caption>
      let dayLabel = '';
      let dateLabel = '';

      const caption = $(table).find('caption');
      if (caption.length > 0) {
        const spans = caption.find('span');
        if (spans.length >= 2) {
          dayLabel = cleanText($(spans[0]).text()).toUpperCase();
          dateLabel = cleanText($(spans[1]).text());
        } else if (spans.length === 1) {
          dayLabel = cleanText($(spans[0]).text()).toUpperCase();
        }
        // Fallback: parse the full caption text
        if (!dayLabel) {
          const capText = cleanText(caption.text());
          for (const dn of dayNames) {
            if (capText.toUpperCase().includes(dn)) {
              dayLabel = dn;
              break;
            }
          }
          const dateMatch = capText.match(/(\d{2}[.\-\/]\d{2}[.\-\/]\d{4})/);
          if (dateMatch) dateLabel = dateMatch[1];
        }
      }

      // Parse data rows (skip the header row)
      const rows = [];
      $(table).find('tr').each((k, tr) => {
        if ($(tr).find('th').length > 0) return; // skip header

        const cols = $(tr).find('td');
        if (cols.length < 3) return;

        const time = cleanText($(cols[0]).text());
        const course = cleanText($(cols[1]).text());

        if (!time || !course) return;
        // Skip if it looks like a header row accidentally
        if (time.toLowerCase() === 'time') return;

        const faculty = cols.length > 2 ? cleanText($(cols[2]).text()) : '';
        const room = cols.length > 3 ? cleanText($(cols[3]).text()) : '';
        const batch = cols.length > 4 ? cleanText($(cols[4]).text()) : '';

        rows.push({ time, course, faculty, room, batch });
      });

      if (rows.length > 0) {
        timetable.push({
          day: dayLabel || `DAY ${timetable.length + 1}`,
          date: dateLabel || '',
          classes: rows,
        });
      }
    });

    // Sort by day order
    const dayOrder = Object.fromEntries(dayNames.map((d, i) => [d, i]));
    timetable.sort((a, b) => (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99));

    // Extract Previous/Next week navigation links
    let prevWeek = null;
    let nextWeek = null;

    $('a').each((i, a) => {
      const text = cleanText($(a).text()).toLowerCase();
      const href = $(a).attr('href') || '';

      if (text.includes('previous') && text.includes('week')) {
        const params = new URL(href, 'https://svit-students.accredia.in:8084/').searchParams;
        prevWeek = {
          prevstart: params.get('prevstart') || '',
          prevend: params.get('prevend') || '',
          j: params.get('j') || '',
        };
      }
      if (text.includes('next') && text.includes('week')) {
        const params = new URL(href, 'https://svit-students.accredia.in:8084/').searchParams;
        nextWeek = {
          nextstart: params.get('nextstart') || '',
          nextend: params.get('nextend') || '',
          j: params.get('j') || '1',
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: timetable,
      navigation: { prevWeek, nextWeek },
    });

  } catch (error) {
    console.error('Timetable Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch timetable data' }, { status: 500 });
  }
}
