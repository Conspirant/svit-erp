import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { cookies } from 'next/headers';
import { setSessionIdentity, getSessionUsn } from '@/lib/authSession';
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

    // 1. Check if profile is already cached
    if (knownUsn) {
      const cachedProfile = erpCache.get(`profile_${knownUsn}`);
      if (cachedProfile) {
        return NextResponse.json({ success: true, data: cachedProfile, fromCache: true });
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

    // Pre-populate from existing cached dashboard if available
    const cachedDash = knownUsn ? erpCache.get(`dash_full_${knownUsn}`) : null;

    const profileData = {
      name: cachedDash?.profileName || '',
      usn: cachedDash?.usn || knownUsn || '',
      department: cachedDash?.department || '',
      categoryalloted: '',
      quota: '',
      semester: cachedDash?.semester || '',
      categoryclaimed: '',
      lastyeardue: '',
    };

    // 2. Fetch the profile details from the FEE page
    try {
      const feeUrl = `${BASE_URL}?option=com_fee&controller=fee&task=studFee`;
      const res = await fetchWithRetry(() =>
        axios.get(feeUrl, {
          httpsAgent,
          timeout: 10000,
          headers: {
            ...COMMON_BROWSER_HEADERS,
            Cookie: sessionCookie,
            Referer: ERP_BASE_URL,
          },
        }),
        { retries: 1, baseDelayMs: 400 }
      );

      const $ = cheerio.load(res.data);

      if ($('input[name="username"]').length > 0 && res.data.includes('Login')) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }

      const pageText = $('body').text().replace(/\s+/g, ' ');

      const labels = [
        'Name',
        'USN',
        'Department',
        'Category Alloted',
        'Quota',
        'Semester',
        'Category Claimed',
        'Last Year Due',
      ];

      const terminators = [...labels, 'Copyright', 'Terms of Service', 'Powered By'];

      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const nextLabels = terminators.filter((t) => t !== label);
        const lookahead = nextLabels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const regex = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*(.*?)\\s*(?=${lookahead}|$)`, 'i');
        const match = pageText.match(regex);
        const key = label.toLowerCase().replace(/\s+/g, '');
        if (match && match[1].trim()) {
          profileData[key] = match[1].trim();
        }
      }

      // Also parse key-value pairs directly from tables if present
      $('table tr').each((_, tr) => {
        const cells = $(tr).find('td, th');
        if (cells.length >= 2) {
          for (let c = 0; c < cells.length - 1; c++) {
            const lbl = $(cells[c]).text().trim().toLowerCase().replace(/[^a-z]/g, '');
            const val = $(cells[c + 1]).text().trim();
            if (lbl.includes('categoryalloted') && val && !profileData.categoryalloted) profileData.categoryalloted = val;
            if (lbl.includes('categoryclaimed') && val && !profileData.categoryclaimed) profileData.categoryclaimed = val;
            if (lbl.includes('quota') && val && !profileData.quota) profileData.quota = val;
            if ((lbl.includes('lastyeardue') || lbl.includes('previousdue')) && val && !profileData.lastyeardue) profileData.lastyeardue = val;
          }
        }
      });
    } catch (e) {
      console.warn('Fee page fetch failed:', e.message);
    }

    const hasMeaningfulProfile = Boolean(profileData.categoryalloted || profileData.quota || profileData.lastyeardue);
    if (profileData.usn && hasMeaningfulProfile) {
      erpCache.set(`profile_${profileData.usn}`, profileData, 3600);
    }

    const response = NextResponse.json({ success: true, data: profileData });
    if (profileData.usn || profileData.name) {
      setSessionIdentity(response, { usn: profileData.usn, name: profileData.name });
    }
    return response;
  } catch (error) {
    console.error('Profile Scraper Error:', error.message);
    return NextResponse.json({
      success: true,
      data: {
        name: '',
        usn: '',
        department: '',
        semester: '',
      },
    });
  }
}
