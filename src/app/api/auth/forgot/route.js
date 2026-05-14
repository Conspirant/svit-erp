import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const FORGOT_URL = 'https://svit-students.accredia.in:8084/index.php?option=com_user&view=forgot';
const MODE_URL = 'https://svit-students.accredia.in:8084/index.php?option=com_user&task=mode';

export async function POST(request) {
  try {
    const { email, mode, phone } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (mode === 1) {
      // Step 1: Submit email to get masked phone number
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('mode', '1');

      const res = await axios.post(MODE_URL, formData.toString(), {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(res.data);
      
      // Look for the masked phone number (e.g. 831095XXXX)
      // Based on the user's screenshot, it's likely in a paragraph or label
      let maskedPhone = '';
      $('p, div, label').each((_, el) => {
        const text = $(el).text().trim();
        if (text.match(/\d+X+/)) {
          maskedPhone = text;
        }
      });

      // Check if it failed (e.g. invalid email)
      if (res.data.includes('invalid') || res.data.includes('Error')) {
         return NextResponse.json({ error: 'The entered email ID is invalid.' }, { status: 400 });
      }

      // If no masked phone found but page changed, maybe it's the next step
      if (!maskedPhone && res.data.includes('Mobile number verification')) {
          // Try to find it again with more specific logic if needed
      }

      return NextResponse.json({ 
        success: true, 
        maskedPhone: maskedPhone || 'XXXXXXXXXX', // Fallback if parsing fails
        debug: maskedPhone ? undefined : 'Masked phone not found in response'
      });

    } else if (mode === 2) {
      // Step 2: Submit email + last 4 digits
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('mobile', phone);
      formData.append('mode', '2');

      const res = await axios.post(MODE_URL, formData.toString(), {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (res.data.includes('successfully sent') || res.data.includes('Success')) {
        return NextResponse.json({ success: true, message: 'Credentials successfully sent to your registered email and mobile.' });
      } else {
        const $ = cheerio.load(res.data);
        const errorMsg = $('.alert-error, .uk-alert-danger').text().trim() || 'Verification failed. Please check the digits and try again.';
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error('Forgot Password Proxy Error:', error.message);
    return NextResponse.json({ error: 'An error occurred while communicating with the ERP server.' }, { status: 500 });
  }
}
