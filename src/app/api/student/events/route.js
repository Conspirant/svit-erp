import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
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

export async function GET() {
  try {
    // 1. Check in-memory cache for calendar events (TTL: 2 hours)
    const cachedEvents = erpCache.get('academic_calendar');
    if (cachedEvents) {
      return NextResponse.json({ success: true, data: cachedEvents, fromCache: true });
    }

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

    const res = await fetchWithRetry(() =>
      axios.get(`${BASE_URL}?option=com_bvbsims&controller=academiccal&task=calenderdisplay&yearId=`, {
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

    const $ = cheerio.load(res.data);

    if ($('input[name="username"]').length > 0 && res.data.includes('Login')) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const events = [];

    // The ERP calendar lists tables or cards per month
    $('.uk-card, table.uk-table, .calendar-month').each((i, el) => {
      const monthTitle = cleanText($(el).find('h3, caption, .uk-card-title').text());
      const monthEvents = [];
      const days = [];

      $(el).find('tr, .event-item').each((j, row) => {
        const text = cleanText($(row).text());
        if (text && text.length > 3) {
          monthEvents.push(text);
        }
      });

      if (monthTitle || monthEvents.length > 0) {
        events.push({
          month: monthTitle || `Month ${i + 1}`,
          events: monthEvents,
          days,
        });
      }
    });

    // Cache the parsed calendar for 2 hours (7200 seconds)
    erpCache.set('academic_calendar', events, 7200);

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Events Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
