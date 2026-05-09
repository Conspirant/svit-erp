import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';

const cleanText = (value) => value?.replace(/\s+/g, ' ').trim() || '';

const getTimeRestrictionMessage = ($) => {
  const pageText = cleanText($('body').text());
  const restrictionMatch = pageText.match(/password can be changed only between\s*8\s*A\.?M\.?\s*to\s*6\s*P\.?M\.?/i);
  if (!restrictionMatch) return '';

  return 'Password recovery is available here anytime. The ERP is not accepting password changes right now, so please try again after 8:00 AM when their server resumes processing.';
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, step, lastFourDigit, firstSixDigit, username } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (step === 2) {
      // Step 2: Submit mobile verification
      if (!lastFourDigit || !firstSixDigit || !username) {
        return NextResponse.json({ error: 'Missing verification data' }, { status: 400 });
      }

      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('lastFourDigit', lastFourDigit);
      formData.append('firstSixDigit', firstSixDigit);
      formData.append('username', username);

      const res = await axios.post(`${BASE_URL}?option=com_user&task=otpentrymobile`, formData.toString(), {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${BASE_URL}?option=com_user&task=mode`,
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const $ = cheerio.load(res.data);
      const timeRestrictionMessage = getTimeRestrictionMessage($);
      if (timeRestrictionMessage) {
        return NextResponse.json({
          success: true,
          queued: true,
          message: timeRestrictionMessage,
        }, { status: 202 });
      }

      const errorMsg = $('#error-modal .uk-modal-body p').text().trim();
      const successMsg = $('#success-modal .uk-modal-body p').text().trim();

      if (errorMsg && !successMsg) {
         return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: successMsg || 'Credentials successfully sent to your email and mobile number.' });

    } else {
      // Step 1: Initial Email Submission
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('mode', '1');

      const res = await axios.post(`${BASE_URL}?option=com_user&task=mode`, formData.toString(), {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${BASE_URL}?option=com_user&task=forgot`,
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      // If it redirects immediately, it might be an error (like 303 to msg=error_invalid)
      if (res.status === 303 || res.status === 302) {
        return NextResponse.json({ error: 'The entered email ID is invalid or not found.' }, { status: 400 });
      }

      const $ = cheerio.load(res.data);
      const timeRestrictionMessage = getTimeRestrictionMessage($);
      if (timeRestrictionMessage) {
        return NextResponse.json({
          success: true,
          queued: true,
          message: timeRestrictionMessage,
        }, { status: 202 });
      }
      
      // Check if it returned the mobile verification page
      const firstSixInput = $('input[name="firstSixDigit"]').val();
      const usernameInput = $('input[name="username"]').val();

      if (firstSixInput && usernameInput) {
        return NextResponse.json({ 
          success: true, 
          requireVerification: true, 
          firstSixDigit: firstSixInput, 
          username: usernameInput 
        });
      }

      const errorMsg = $('.alert-error, .uk-alert-danger, #error-modal .uk-modal-body p').text().trim();
      if (errorMsg) {
         return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Reset link sent.' });
    }

  } catch (error) {
    console.error('Forgot Password Proxy Error:', error.message);
    return NextResponse.json({ error: 'An error occurred while contacting the server.' }, { status: 500 });
  }
}
