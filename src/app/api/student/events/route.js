import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { erpCache } from '@/lib/erpCache';
import { fetchWithRetry } from '@/lib/fetchRetry';
import {
  ERP_BASE_URL,
  DEFAULT_USER_AGENT,
  COMMON_BROWSER_HEADERS,
  createHttpsAgent,
} from '@/lib/erpConfig';

const httpsAgent = createHttpsAgent();
const BASE_URL = ERP_BASE_URL;

const cleanText = (value) => value?.replace(/\s+/g, ' ').trim() || '';

const WEEKDAY_FALLBACK = [
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' },
];

const normalizeWeekday = (value, index) => {
  const fallback = WEEKDAY_FALLBACK[index] || { short: cleanText(value), long: cleanText(value) };
  const label = cleanText(value) || fallback.short;
  const match = WEEKDAY_FALLBACK.find((day) => day.short.toLowerCase() === label.slice(0, 3).toLowerCase());
  return {
    short: match?.short || label.slice(0, 3),
    long: match?.long || label,
  };
};

function parseCalendarHtml(html) {
  const $ = cheerio.load(html);
  const eventsData = [];

  $('.cn-coe-table').each((i, tableEl) => {
    const table = $(tableEl);
    const monthTitle = cleanText(table.find('caption span').text() || table.find('caption').text());
    if (!monthTitle) return;

    const weekdays = table
      .find('thead th')
      .map((j, th) => normalizeWeekday($(th).text(), j))
      .get();
    const weekdayLabels = weekdays.length > 0 ? weekdays : WEEKDAY_FALLBACK;

    const monthGrid = table.closest('.uk-grid, [uk-grid]');
    const eventScope = monthGrid.length > 0 ? monthGrid : table.parent().parent();
    const events = eventScope
      .find('.events-lists')
      .map((j, ev) => cleanText($(ev).text()))
      .get()
      .filter(Boolean);

    const days = [];
    table.find('tbody tr').each((rowIndex, row) => {
      $(row)
        .find('td')
        .each((columnIndex, td) => {
          const text = cleanText($(td).text());
          const weekday = weekdayLabels[columnIndex] || WEEKDAY_FALLBACK[columnIndex] || { short: '', long: '' };
          if (!text) {
            days.push({
              day: '',
              type: 'empty',
              column: columnIndex,
              weekday: weekday.short,
              weekdayFull: weekday.long,
            });
            return;
          }

          let type = 'normal';
          if ($(td).find('.cn-holiday').length > 0) type = 'holiday';
          else if ($(td).find('.cn-minor-exam').length > 0) type = 'exam';

          days.push({
            day: text,
            type,
            column: columnIndex,
            weekday: weekday.short,
            weekdayFull: weekday.long,
          });
        });
    });

    eventsData.push({
      month: monthTitle,
      events,
      weekdays: weekdayLabels,
      days,
    });
  });

  return eventsData;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearId = searchParams.get('yearId') || '';
    const cacheKey = `academic_calendar_${yearId || 'default'}`;

    // 1. Check in-memory cache
    if (!searchParams.get('refresh')) {
      const cachedEvents = erpCache.get(cacheKey);
      if (cachedEvents && cachedEvents.length > 0) {
        return NextResponse.json({ success: true, data: cachedEvents, fromCache: true });
      }
    }

    const cookieStore = await cookies();
    const cookieStrings = [];

    cookieStore.getAll().forEach((cookie) => {
      if (cookie.name !== 'dashboard_url') {
        cookieStrings.push(`${cookie.name}=${cookie.value}`);
      }
    });

    const sessionCookie = cookieStrings.join('; ');

    let parsedEvents = [];

    if (sessionCookie) {
      try {
        const url = `${BASE_URL}?option=com_bvbsims&controller=academiccal&task=calenderdisplay&yearId=${yearId}`;
        const res = await fetchWithRetry(
          () =>
            axios.get(url, {
              httpsAgent,
              timeout: 15000,
              headers: {
                ...COMMON_BROWSER_HEADERS,
                Cookie: sessionCookie,
                Referer: ERP_BASE_URL,
              },
            }),
          { retries: 2, baseDelayMs: 400 }
        );

        const resText = typeof res.data === 'string' ? res.data : (typeof res.data === 'object' && res.data !== null ? JSON.stringify(res.data) : String(res.data || ''));
        if (resText && !resText.includes('Login to Your Account')) {
          parsedEvents = parseCalendarHtml(res.data);
        }
      } catch (err) {
        console.warn('Live calendar fetch error:', err.message);
      }
    }

    // 2. Fallback to local snapshot if live parse returned no months (e.g. session issue or ERP maintenance)
    if (!parsedEvents || parsedEvents.length === 0) {
      try {
        const snapshotPath = path.join(process.cwd(), 'events.html');
        if (fs.existsSync(snapshotPath)) {
          const snapshotHtml = fs.readFileSync(snapshotPath, 'utf8');
          parsedEvents = parseCalendarHtml(snapshotHtml);
        }
      } catch (e) {
        console.warn('Fallback calendar snapshot load error:', e.message);
      }
    }

    if (parsedEvents.length > 0) {
      erpCache.set(cacheKey, parsedEvents, 7200);
    }

    return NextResponse.json({
      success: true,
      data: parsedEvents,
    });
  } catch (error) {
    console.error('Events Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
