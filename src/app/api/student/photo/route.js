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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const knownUsn = getSessionUsn(cookieStore);

    // 1. Check if we already have the photo in memory cache from dashboard
    if (knownUsn) {
      const cachedDash = erpCache.get(`dash_full_${knownUsn}`);
      if (cachedDash?.photoUrl) {
        return NextResponse.json({ success: true, photo: cachedDash.photoUrl, fromCache: true });
      }
    }

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

    const rawDashUrl = cookieStore.get('dashboard_url')?.value;
    const dashUrl = rawDashUrl ? resolveErpUrl(rawDashUrl) : `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=dashboard`;

    const res = await fetchWithRetry(() =>
      axios.get(dashUrl, {
        httpsAgent,
        timeout: 10000,
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

    let photoUrl = '';
    const imgSelectors = [
      '.cn-user-avatar img',
      '.profile-photo img',
      '.user-photo img',
      '.student-photo img',
      '.uk-cover img',
      '.profile-img img',
      'img[alt*="profile"]',
      'img[alt*="photo"]',
      'img[alt*="student"]',
      '.cn-user-image img',
      '.avatar img',
    ];

    for (const selector of imgSelectors) {
      const img = $(selector).first();
      if (img.length > 0) {
        photoUrl = img.attr('src') || '';
        if (photoUrl) break;
      }
    }

    if (!photoUrl) {
      $('img').each((i, el) => {
        const src = $(el).attr('src') || '';
        const lower = src.toLowerCase();
        if (
          (lower.includes('photo') || lower.includes('profile') || lower.includes('student') || lower.includes('avatar') || lower.includes('upload')) &&
          !lower.includes('logo') && !lower.includes('banner') && !lower.includes('header') && !lower.includes('brand')
        ) {
          photoUrl = src;
          return false;
        }
      });
    }

    if (photoUrl) {
      photoUrl = resolveErpUrl(photoUrl);
    }

    return NextResponse.json({
      success: true,
      photo: photoUrl || null,
    });
  } catch (error) {
    console.error('Photo scraper error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}
