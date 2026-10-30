import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { cookies } from 'next/headers';
import { getSessionUsn } from '@/lib/authSession';
import { erpCache } from '@/lib/erpCache';
import { fetchWithRetry } from '@/lib/fetchRetry';
import {
  ERP_BASE_URL,
  DEFAULT_USER_AGENT,
  COMMON_BROWSER_HEADERS,
  createHttpsAgent,
  resolveErpUrl,
} from '@/lib/erpConfig';

const httpsAgent = createHttpsAgent();
const BASE_URL = ERP_BASE_URL;

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

    const knownUsn = getSessionUsn(cookieStore);
    const cacheKey = `tt_${knownUsn || 'anon'}_${weekType || 'curr'}_${prevStart || ''}_${nextStart || ''}`;

    // Return cached timetable if available
    const cachedEntry = erpCache.get(cacheKey);
    if (cachedEntry && !searchParams.get('refresh')) {
      const dataArr = Array.isArray(cachedEntry) ? cachedEntry : (cachedEntry.timetable || []);
      const navObj = cachedEntry.navigation || { prevWeek: null, nextWeek: null };
      return NextResponse.json({ success: true, data: dataArr, navigation: navObj, fromCache: true });
    }

    let url = `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=timetable`;

    if (weekType === 'prev' && prevStart && prevEnd) {
      url += `&j=${j || ''}&prevstart=${prevStart}&prevend=${prevEnd}&type=prev`;
    } else if (weekType === 'next' && nextStart && nextEnd) {
      url += `&j=${j || '1'}&nextstart=${nextStart}&nextend=${nextEnd}&type=next`;
    }

    const dashboardUrlCookie = cookieStore.get('dashboard_url');
    const refererUrl = dashboardUrlCookie ? resolveErpUrl(dashboardUrlCookie.value) : ERP_BASE_URL;

    const res = await fetchWithRetry(() =>
      axios.get(url, {
        httpsAgent,
        timeout: 15000,
        headers: {
          ...COMMON_BROWSER_HEADERS,
          Cookie: sessionCookie,
          Referer: refererUrl,
        },
      }),
      { retries: 2, baseDelayMs: 400 }
    );

    const $ = cheerio.load(res.data);

    if ($('input[name="username"]').length > 0 && res.data.includes('Login')) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const timetable = [];
    const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    $('table').each((i, table) => {
      const headerCells = [];
      $(table).find('thead tr th, tr:first-child th').each((j, th) => {
        headerCells.push(cleanText($(th).text()).toLowerCase());
      });

      if (headerCells.length !== 5 || !headerCells[0].includes('time')) return;

      let dayLabel = '';
      let dateLabel = '';

      const caption = $(table).find('caption');
      if (caption.length > 0) {
        const spans = caption.find('span');
        if (spans.length >= 2) {
          dayLabel = cleanText($(spans[0]).text()).toUpperCase();
          dateLabel = cleanText($(spans[1]).text());
        } else if (spans.length === 1) {
          const text = cleanText($(spans[0]).text());
          const match = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*(\d{2}-\d{2}-\d{4})/i);
          if (match) {
            dayLabel = match[1].toUpperCase();
            dateLabel = match[2];
          }
        }
      }

      if (!dayLabel) {
        const capText = cleanText(caption.text()).toUpperCase();
        for (const dn of dayNames) {
          if (capText.includes(dn)) {
            dayLabel = dn;
            const dm = capText.match(/(\d{2}-\d{2}-\d{4})/);
            if (dm) dateLabel = dm[1];
            break;
          }
        }
      }

      const rows = [];
      $(table).find('tbody tr').each((j, row) => {
        const cells = $(row).find('td');
        if (cells.length < 5) return;

        const time = cleanText($(cells[0]).text());
        const course = cleanText($(cells[1]).text());
        const faculty = cleanText($(cells[2]).text());
        const room = cleanText($(cells[3]).text());
        const batch = cleanText($(cells[4]).text());

        let courseCode = '';
        let courseName = course;
        const codeMatch = course.match(/^([A-Z0-9_]+)\s*-\s*(.+)$/i);
        if (codeMatch) {
          courseCode = codeMatch[1].trim();
          courseName = codeMatch[2].trim();
        }

        if (time) {
          rows.push({
            time,
            course: courseName,
            courseCode,
            faculty,
            room,
            batch,
          });
        }
      });

      if (rows.length > 0) {
        timetable.push({
          day: dayLabel || `DAY_${timetable.length + 1}`,
          date: dateLabel,
          classes: rows,
        });
      }
    });

    let prevWeek = null;
    let nextWeek = null;

    $('a').each((i, a) => {
      const text = cleanText($(a).text()).toLowerCase();
      const href = $(a).attr('href') || '';

      if (text.includes('previous') && (text.includes('week') || href.includes('type=prev'))) {
        try {
          const params = new URL(href, ERP_BASE_URL).searchParams;
          prevWeek = {
            prevstart: params.get('prevstart') || '',
            prevend: params.get('prevend') || '',
            j: params.get('j') || '',
          };
        } catch {}
      }
      if (text.includes('next') && (text.includes('week') || href.includes('type=next'))) {
        try {
          const params = new URL(href, ERP_BASE_URL).searchParams;
          nextWeek = {
            nextstart: params.get('nextstart') || '',
            nextend: params.get('nextend') || '',
            j: params.get('j') || '1',
          };
        } catch {}
      }
    });

    const navigation = { prevWeek, nextWeek };
    erpCache.set(cacheKey, { timetable, navigation }, 1800);

    return NextResponse.json({
      success: true,
      data: timetable,
      navigation,
    });
  } catch (error) {
    console.error('Timetable Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch timetable' }, { status: 500 });
  }
}
