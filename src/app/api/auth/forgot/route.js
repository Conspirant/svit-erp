import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';
const MODE_URL = `${BASE_URL}?option=com_user&task=mode`;

const cleanText = (value) => value?.replace(/\s+/g, ' ').trim() || '';

const getTimeRestrictionMessage = ($) => {
  const pageText = cleanText($('body').text());
  const restrictionMatch = pageText.match(/password can be changed only between\s*8\s*A\.?M\.?\s*to\s*6\s*P\.?M\.?/i);
  if (!restrictionMatch) return '';

  return 'Password recovery is available here anytime. The ERP is not accepting password changes right now, so please try again after 8:00 AM when their server resumes processing.';
};

export async function POST(request) {
  try {
    const { email, mode, phone, firstSixDigit, erpUsername } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (mode === 1) {
      // Step 1: Submit email to get masked digits and hidden username
      const normalizedEmail = email.toLowerCase().trim();
      const formData = new URLSearchParams();
      formData.append('option', 'com_user');
      formData.append('task', 'mode');
      formData.append('username', normalizedEmail);
      formData.append('mode', '1');

      const res = await axios.post(MODE_URL, formData.toString(), {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Referer': `${BASE_URL}?option=com_user&view=forgot`,
          'Origin': 'https://svit-students.accredia.in:8084',
        },
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

      // Check if it returned the mobile verification page
      const firstSixInput = $('input[name="firstSixDigit"]').val();
      const usernameInput = $('input[name="username"]').val();

      if (firstSixInput && usernameInput) {
        return NextResponse.json({ 
          success: true, 
          maskedPhone: `${firstSixInput}XXXX`,
          firstSixDigit: firstSixInput,
          erpUsername: usernameInput 
        });
      }

      // Fallback: try to parse masked phone if inputs aren't found
      let maskedPhone = '';
      $('p, div, label, span, h3, b, strong').each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/\d{2,6}X{2,8}/);
        if (match) {
          maskedPhone = match[0];
          return false;
        }
      });

      if (maskedPhone) {
        return NextResponse.json({ 
          success: true, 
          maskedPhone: maskedPhone,
          firstSixDigit: maskedPhone.replace(/X/g, ''),
          erpUsername: email // Fallback to email as username
        });
      }

      const errorMsg = $('.alert-error, .uk-alert-danger, #error-modal .uk-modal-body p').text().trim();
      if (errorMsg && errorMsg.length > 5) {
         return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      return NextResponse.json({ 
        error: 'The entered email ID is invalid or not registered.' 
      }, { status: 400 });

    } else if (mode === 2) {
      // Step 2: Submit mobile verification to the dedicated endpoint
      const normalizedEmail = email.toLowerCase().trim();
      const formData = new URLSearchParams();
      formData.append('email', normalizedEmail);
      formData.append('lastFourDigit', phone);
      formData.append('firstSixDigit', firstSixDigit || '');
      formData.append('username', erpUsername || normalizedEmail);

      const res = await axios.post(`${BASE_URL}?option=com_user&task=otpentrymobile`, formData.toString(), {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Referer': MODE_URL,
          'Origin': 'https://svit-students.accredia.in:8084',
        },
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const body = res.data.toString();
      const $ = cheerio.load(body);
      
      const timeRestrictionMessage = getTimeRestrictionMessage($);
      if (timeRestrictionMessage) {
        return NextResponse.json({
          success: true,
          message: timeRestrictionMessage,
        }, { status: 202 });
      }

      const successMsg = $('#success-modal .uk-modal-body p').text().trim() || 
                         (body.includes('successfully sent') ? 'Credentials successfully sent to your email and mobile number.' : '');

      if (successMsg || body.includes('successfully') || body.includes('Success')) {
        return NextResponse.json({ success: true, message: successMsg || 'Credentials successfully sent to your registered email and mobile.' });
      } else {
        const errorMsg = $('#error-modal .uk-modal-body p').text().trim() || 
                         $('.alert-error, .uk-alert-danger').text().trim();
        
        return NextResponse.json({ 
          error: errorMsg || 'Verification failed. Please check the digits and try again.',
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error('Forgot Password Proxy Error:', error.message);
    return NextResponse.json({ error: 'An error occurred while communicating with the ERP server.' }, { status: 500 });
  }
}
