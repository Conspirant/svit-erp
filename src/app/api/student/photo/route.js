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

    // Get the dashboard page which contains the student photo
    const dashUrl = cookieStore.get('dashboard_url')?.value || `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=dashboard`;

    const res = await axios.get(dashUrl, {
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

    // Try to find student photo - common patterns in ERP portals
    let photoUrl = '';

    // Look for profile image in common selectors
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

    // Fallback: find any img with src containing 'photo', 'profile', 'student', 'avatar', or 'upload'
    if (!photoUrl) {
      $('img').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (src && (
          src.includes('photo') || 
          src.includes('profile') || 
          src.includes('student') || 
          src.includes('avatar') || 
          src.includes('upload') ||
          src.includes('image') ||
          src.includes('pic')
        )) {
          photoUrl = src;
          return false; // break
        }
      });
    }

    // If photoUrl is relative, make it absolute
    if (photoUrl && !photoUrl.startsWith('http')) {
      if (photoUrl.startsWith('/')) {
        photoUrl = `https://svit-students.accredia.in:8084${photoUrl}`;
      } else {
        photoUrl = `https://svit-students.accredia.in:8084/${photoUrl}`;
      }
    }

    // If we found a photo URL, proxy it back as base64 to avoid CORS
    if (photoUrl) {
      try {
        const photoRes = await axios.get(photoUrl, {
          httpsAgent,
          timeout: 10000,
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': sessionCookie,
          },
        });

        const contentType = photoRes.headers['content-type'] || 'image/jpeg';
        const base64 = Buffer.from(photoRes.data).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        return NextResponse.json({ success: true, photo: dataUrl });
      } catch (e) {
        // Photo download failed, return without photo
        return NextResponse.json({ success: true, photo: '' });
      }
    }

    return NextResponse.json({ success: true, photo: '' });

  } catch (error) {
    console.error('Photo Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}
