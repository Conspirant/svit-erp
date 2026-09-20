import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';
import { cookies } from 'next/headers';
import { setSessionIdentity } from '@/lib/authSession';

import {
  ERP_BASE_URL,
  DEFAULT_USER_AGENT,
  createHttpsAgent,
} from '@/lib/erpConfig';

const httpsAgent = createHttpsAgent();

const BASE_URL = ERP_BASE_URL;

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

    const profileData = {
      name: '',
      usn: '',
      department: '',
      categoryalloted: '',
      quota: '',
      semester: '',
      categoryclaimed: '',
      lastyeardue: '',
    };

    // 1. Try to fetch the profile data from the FEE page under "Student Basic Details"
    try {
      const feeUrl = `${BASE_URL}?option=com_fee&controller=fee&task=studFee`;
      const res = await axios.get(feeUrl, {
        httpsAgent,
        timeout: 10000,
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Cookie': sessionCookie,
        },
      });

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
        'Last Year Due'
      ];

      const terminators = [...labels, 'Copyright', 'Terms of Service', 'Powered By'];

      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const nextLabels = terminators.filter(t => t !== label);
        const lookahead = nextLabels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const regex = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*(.*?)\\s*(?=${lookahead}|$)`, 'i');
        const match = pageText.match(regex);
        const key = label.toLowerCase().replace(/\s+/g, '');
        if (match && match[1].trim()) {
          profileData[key] = match[1].trim();
        }
      }
    } catch (e) {
      console.warn('Fee page fetch failed, falling back to dashboard:', e.message);
    }

    // 2. Fallback: if fee page didn't provide name or usn, extract from dashboard
    if (!profileData.name || !profileData.usn) {
      try {
        const dashUrl = cookieStore.get('dashboard_url')?.value || `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=dashboard`;
        const dashRes = await axios.get(dashUrl, {
          httpsAgent,
          timeout: 10000,
          headers: { 
            'User-Agent': DEFAULT_USER_AGENT,
            'Cookie': sessionCookie 
          },
        });
        const d$ = cheerio.load(dashRes.data);
        const dashText = d$('body').text().replace(/\s+/g, ' ');

        // Extract USN from page
        const usnMatch = dashText.match(/(1[A-Za-z]{2}\d{2}[A-Za-z]{2}\d{3})/i);
        if (usnMatch && !profileData.usn) profileData.usn = usnMatch[1].toUpperCase();

        // Extract "B.E-CD, SEM 03, SEC B" or similar pattern
        const headerMatch = dashText.match(/([A-Za-z.\-]+)\s*,\s*SEM\s*0?(\d+)\s*,?\s*SEC\s*([A-Z])?/i);
        if (headerMatch) {
          if (!profileData.department) profileData.department = headerMatch[1].trim();
          if (!profileData.semester) profileData.semester = headerMatch[2].trim();
        }

        // Name from profile area
        const nameEl = d$('.cn-user-name, .profile-name, .cn-profile-title, .user-name').first().text().trim();
        if (nameEl && !profileData.name) profileData.name = nameEl;
      } catch (e) {
        console.warn('Dashboard fallback fetch failed:', e.message);
      }
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
        semester: ''
      }
    });
  }
}
