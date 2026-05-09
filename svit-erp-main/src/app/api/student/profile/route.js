import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';
import { cookies } from 'next/headers';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 5,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';

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

    // The profile data lives on the FEE page under "Student Basic Details"
    const feeUrl = `${BASE_URL}?option=com_fee&controller=fee&task=studFee`;

    const res = await axios.get(feeUrl, {
      httpsAgent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': sessionCookie,
      },
    });

    const $ = cheerio.load(res.data);

    if ($('input[name="username"]').length > 0 && res.data.includes('Login')) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const pageText = $('body').text().replace(/\s+/g, ' ');

    // The fee page contains: "Student Basic Details Name: X USN: Y Department: Z ..."
    // Extract each labeled field using lookahead to the next label
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
    const profileData = {};

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      // Find "Label:" then capture everything until the next known label or end markers
      const nextLabels = terminators.filter(t => t !== label);
      const lookahead = nextLabels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*(.*?)\\s*(?=${lookahead}|$)`, 'i');
      const match = pageText.match(regex);
      const key = label.toLowerCase().replace(/\s+/g, '');
      profileData[key] = match ? match[1].trim() : '';
    }

    // Fallback: if fee page didn't work, try extracting from dashboard header
    if (!profileData.name && !profileData.usn) {
      try {
        const dashUrl = cookieStore.get('dashboard_url')?.value || `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=dashboard`;
        const dashRes = await axios.get(dashUrl, {
          httpsAgent,
          timeout: 10000,
          headers: { 'Cookie': sessionCookie },
        });
        const d$ = cheerio.load(dashRes.data);
        const dashText = d$('body').text().replace(/\s+/g, ' ');

        // Extract USN from page
        const usnMatch = dashText.match(/(1[A-Za-z]{2}\d{2}[A-Za-z]{2}\d{3})/i);
        if (usnMatch) profileData.usn = usnMatch[1].toUpperCase();

        // Extract "B.E-CD, SEM 02, SEC F" pattern
        const headerMatch = dashText.match(/([A-Za-z.\-]+)\s*,\s*SEM\s*0?(\d+)\s*,?\s*SEC\s*([A-Z])?/i);
        if (headerMatch) {
          profileData.department = headerMatch[1].trim();
          profileData.semester = headerMatch[2].trim();
        }

        // Name from profile area
        const nameEl = d$('.cn-user-name, .profile-name').first().text().trim();
        if (nameEl) profileData.name = nameEl;
      } catch {}
    }

    return NextResponse.json({ success: true, data: profileData });

  } catch (error) {
    console.error('Profile Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 });
  }
}
