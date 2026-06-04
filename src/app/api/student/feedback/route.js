import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import fs from 'fs';
import path from 'path';

const debugLog = (msg) => {
  try {
    const logPath = 'c:\\Users\\risha\\OneDrive\\Desktop\\svit-erp-main\\scratch\\feedback_debug.log';
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {
    console.error('Failed to write debug log:', e);
  }
};

export const dynamic = 'force-dynamic';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';
const cleanText = (value) => value?.replace(/\s+/g, ' ').trim() || '';

const getFullUrl = (href) => {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  const base = BASE_URL.substring(0, BASE_URL.lastIndexOf('/'));
  if (href.startsWith('/')) return `${base}${href}`;
  return `${base}/${href}`;
};

async function fetchPage(url, sessionCookie, config = {}) {
  let currentUrl = url;
  let currentCookie = sessionCookie;
  let hop = 0;
  let res = null;

  while (hop < 5) {
    debugLog(`[fetchPage] Hop ${hop}: GET ${currentUrl.substring(0, 100)}`);
    res = await axios.get(currentUrl, {
      httpsAgent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': currentCookie,
      },
      maxRedirects: 0,
      validateStatus: () => true,
      ...config,
    });

    currentCookie = updateCookies(currentCookie, res.headers['set-cookie']);

    if (res.status === 301 || res.status === 302 || res.status === 303) {
      const location = res.headers.location;
      if (!location) break;
      currentUrl = location.startsWith('http') ? location : getFullUrl(location);
      hop++;
    } else {
      res.headers['set-cookie'] = currentCookie.split('; ').map(c => `${c}; Path=/`);
      return res;
    }
  }
  
  if (res) {
    res.headers['set-cookie'] = currentCookie.split('; ').map(c => `${c}; Path=/`);
    return res;
  }
  throw new Error(`Too many redirects (max 5)`);
}

async function postForm(url, data, sessionCookie) {
  let currentUrl = url;
  let currentCookie = sessionCookie;
  let hop = 0;
  let res = null;

  debugLog(`[postForm] POST ${currentUrl.substring(0, 100)}`);
  res = await axios.post(currentUrl, data, {
    httpsAgent,
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': currentCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    maxRedirects: 0,
    validateStatus: () => true,
  });

  currentCookie = updateCookies(currentCookie, res.headers['set-cookie']);

  while ((res.status === 301 || res.status === 302 || res.status === 303) && hop < 5) {
    const location = res.headers.location;
    if (!location) break;
    currentUrl = location.startsWith('http') ? location : getFullUrl(location);
    hop++;

    debugLog(`[postForm] Redirect Hop ${hop}: GET ${currentUrl.substring(0, 100)}`);
    res = await axios.get(currentUrl, {
      httpsAgent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': currentCookie,
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    currentCookie = updateCookies(currentCookie, res.headers['set-cookie']);
  }

  res.headers['set-cookie'] = currentCookie.split('; ').map(c => `${c}; Path=/`);
  return res;
}

function isLoginPage($, html) {
  return $('input[name="username"]').length > 0 || (html || '').includes('Login to Your Account');
}

// Cookie Synchronization Helpers
function updateCookies(currentCookieString, setCookieHeader) {
  if (!setCookieHeader) return currentCookieString;
  const cookies = {};
  if (currentCookieString) {
    currentCookieString.split(';').forEach(c => {
      const parts = c.trim().split('=');
      if (parts[0]) {
        cookies[parts[0].trim()] = parts.slice(1).join('=');
      }
    });
  }
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  headers.forEach(h => {
    const cookiePart = h.split(';')[0];
    const parts = cookiePart.trim().split('=');
    if (parts[0]) {
      cookies[parts[0].trim()] = parts.slice(1).join('=');
    }
  });
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function setUpdatedCookies(response, updatedCookieString) {
  if (!updatedCookieString) return;
  updatedCookieString.split(';').forEach(c => {
    const parts = c.trim().split('=');
    const name = parts[0]?.trim();
    const value = parts.slice(1).join('=');
    if (name && name !== 'dashboard_url') {
      response.cookies.set(name, value, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
    }
  });
}

// Robust scraper to parse feedback list details
function parseFeedbackPage(html) {
  const $ = cheerio.load(html);
  const pending = [];
  const completed = [];
  let acknowledgementUrl = '';

  // 1. Find acknowledgement link
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = cleanText($(el).text()).toUpperCase();
    if (href.includes('printacknowledgement') || href.includes('acknowledgement') || text.includes('ACKNOWLEDGEMENT')) {
      acknowledgementUrl = href;
    }
  });

  // 2. Parse faculty list tables
  $('table').each((tableIdx, table) => {
    const captionText = cleanText($(table).find('caption').text()).toUpperCase();
    const isCompletedTable = captionText.includes('COMPLETED');

    $(table).find('tr').each((rowIdx, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 4) {
        const faculty = cleanText(cells.eq(0).text());
        const semSec = cleanText(cells.eq(1).text());
        const courseCode = cleanText(cells.eq(2).text());
        const courseName = cleanText(cells.eq(3).text());

        const item = {
          faculty,
          semSec,
          courseCode,
          courseName,
        };

        if (isCompletedTable) {
          completed.push(item);
          return;
        }

        // Find give feedback link in this row
        let giveFeedbackLink = '';

        // Check standard <a> tags (even if URL is signed/encrypted with ksign)
        $(row).find('a').each((j, el) => {
          const href = $(el).attr('href') || '';
          const onclick = $(el).attr('onclick') || '';
          const txt = cleanText($(el).text()).toUpperCase();

          if (txt.includes('GIVEN')) return;

          if (href && (href.includes('task=feedbackform') || href.includes('feedbackform') || href.includes('studentfeedback') || href.includes('questionschoices') || txt.includes('GIVE') || txt.includes('FEEDBACK'))) {
            giveFeedbackLink = href;
          } else if (onclick) {
            const match = onclick.match(/href\s*=\s*['"]([^'"]+)['"]/) || onclick.match(/location\s*=\s*['"]([^'"]+)['"]/);
            if (match) giveFeedbackLink = match[1];
          }
        });

        // Check form actions
        if (!giveFeedbackLink) {
          const form = $(row).find('form');
          if (form.length > 0) {
            const action = form.attr('action');
            if (action) giveFeedbackLink = action;
          }
        }

        // Check buttons/inputs with onclick
        if (!giveFeedbackLink) {
          $(row).find('button, input[type="button"], input[type="submit"]').each((j, el) => {
            const onclick = $(el).attr('onclick') || '';
            const txt = (cleanText($(el).text()) || $(el).attr('value') || '').toUpperCase();

            if (txt.includes('GIVEN')) return;

            if (onclick) {
              const match = onclick.match(/href\s*=\s*['"]([^'"]+)['"]/) || onclick.match(/location\s*=\s*['"]([^'"]+)['"]/);
              if (match) giveFeedbackLink = match[1];
            } else if (txt.includes('GIVE') || txt.includes('FEEDBACK')) {
              giveFeedbackLink = 'form-submit';
            }
          });
        }

        if (giveFeedbackLink) {
          item.url = giveFeedbackLink;
          pending.push(item);
        } else {
          completed.push(item);
        }
      }
    });
  });

  // Deduplicate pending
  const seenPending = new Set();
  const uniquePending = pending.filter(p => {
    const key = `${p.courseCode}-${p.faculty}`;
    if (seenPending.has(key)) return false;
    seenPending.add(key);
    return true;
  });

  // Deduplicate completed
  const seenCompleted = new Set();
  const uniqueCompleted = completed.filter(c => {
    const key = `${c.courseCode}-${c.faculty}`;
    if (seenCompleted.has(key)) return false;
    seenCompleted.add(key);
    return true;
  });

  // Get title, filtering out student name and SVIT/Contineo banners
  let title = '';
  $('h1, h2, h3, h4, h5, h6').each((i, el) => {
    const text = cleanText($(el).text());
    if (text.toLowerCase().includes('feedback') && (text.toLowerCase().includes('term') || text.toLowerCase().includes('phase') || /\d/.test(text))) {
      title = text;
    }
  });
  if (!title) {
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const text = cleanText($(el).text());
      if (text.toLowerCase().includes('feedback') && !text.toLowerCase().includes('staff') && !text.toLowerCase().includes('pending') && !text.toLowerCase().includes('completed')) {
        title = text;
      }
    });
  }
  if (!title) {
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const text = cleanText($(el).text());
      if (text && text.length > 5 && !text.includes('SAI VIDYA') && !text.includes('Contineo') && !/^[A-Z\s\.]+$/.test(text)) {
        title = text;
      }
    });
  }

  return {
    title,
    pending: uniquePending,
    completed: uniqueCompleted,
    acknowledgementUrl,
  };
}

// GET handler
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const cookieStrings = [];

    cookieStore.getAll().forEach((cookie) => {
      if (cookie.name !== 'dashboard_url') {
        cookieStrings.push(`${cookie.name}=${cookie.value}`);
      }
    });

    let sessionCookie = cookieStrings.join('; ');
    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('feedbackId');
    const action = searchParams.get('action');

    debugLog(`GET request received. feedbackId=${feedbackId}, action=${action}, cookieStore.length=${cookieStore.getAll().length}`);
    debugLog(`sessionCookie to send: ${sessionCookie}`);

    if (!sessionCookie) {
      debugLog(`Error: sessionCookie is empty!`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch raw print acknowledgement
    if (feedbackId && action === 'acknowledgement') {
      const listUrl = `${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedbacktypes`;
      debugLog(`Fetching acknowledgement listUrl: ${listUrl}`);
      let res = await fetchPage(listUrl, sessionCookie);
      sessionCookie = updateCookies(sessionCookie, res.headers['set-cookie']);
      let $ = cheerio.load(res.data);

      const listIsLogin = isLoginPage($, res.data);
      debugLog(`listUrl page length: ${res.data?.length}, isLogin: ${listIsLogin}`);

      if (listIsLogin) {
        debugLog(`Error: listUrl returned login page (session expired)`);
        return new NextResponse('Session expired. Please log in again.', { status: 401 });
      }

      let targetHref = '';
      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes(`feedbackId=${feedbackId}`)) {
          targetHref = href;
        }
      });

      if (!targetHref) {
        targetHref = `?option=com_feedback&controller=feedbackentry&task=feedback&feedbackId=${feedbackId}`;
      }

      const detailUrl = getFullUrl(targetHref);
      debugLog(`Fetching acknowledgement detailUrl: ${detailUrl}`);
      const detailRes = await fetchPage(detailUrl, sessionCookie);
      sessionCookie = updateCookies(sessionCookie, detailRes.headers['set-cookie']);

      const parsed = parseFeedbackPage(detailRes.data);
      debugLog(`parsed detail page. has acknowledgementUrl: ${!!parsed.acknowledgementUrl}`);
      
      if (!parsed.acknowledgementUrl) {
        debugLog(`Error: acknowledgementUrl not found in detail page`);
        return new NextResponse('Acknowledgement form not available yet.', { status: 400 });
      }

      const ackUrl = getFullUrl(parsed.acknowledgementUrl);
      debugLog(`Fetching acknowledgement ackUrl: ${ackUrl}`);
      const ackRes = await fetchPage(ackUrl, sessionCookie, { responseType: 'arraybuffer', timeout: 30000 });
      sessionCookie = updateCookies(sessionCookie, ackRes.headers['set-cookie']);

      const isPdf = ackRes.headers['content-type']?.includes('pdf') || 
                    (ackRes.data && (
                      (Buffer.isBuffer(ackRes.data) && ackRes.data.toString('utf-8').startsWith('%PDF')) ||
                      (typeof ackRes.data === 'string' && ackRes.data.startsWith('%PDF')) ||
                      (ackRes.data instanceof ArrayBuffer && new TextDecoder().decode(ackRes.data.slice(0, 4)) === '%PDF')
                    ));

      const response = new NextResponse(ackRes.data, {
        headers: {
          'Content-Type': isPdf ? 'application/pdf' : 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="feedback_acknowledgement_${feedbackId}.${isPdf ? 'pdf' : 'html'}"`,
        },
      });
      setUpdatedCookies(response, sessionCookie);
      return response;
    }

    // 2. Fetch specific feedback form details (faculty members list)
    if (feedbackId) {
      const listUrl = `${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedbacktypes`;
      debugLog(`Fetching feedback details listUrl: ${listUrl}`);
      let res = await fetchPage(listUrl, sessionCookie);
      sessionCookie = updateCookies(sessionCookie, res.headers['set-cookie']);
      let $ = cheerio.load(res.data);

      const listIsLogin = isLoginPage($, res.data);
      debugLog(`listUrl page length: ${res.data?.length}, isLogin: ${listIsLogin}`);

      if (listIsLogin) {
        debugLog(`Error: listUrl returned login page (session expired)`);
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }

      let targetHref = '';
      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes(`feedbackId=${feedbackId}`)) {
          targetHref = href;
        }
      });

      if (!targetHref) {
        targetHref = `?option=com_feedback&controller=feedbackentry&task=feedback&feedbackId=${feedbackId}`;
      }

      const url = getFullUrl(targetHref);
      debugLog(`Fetching feedback details url: ${url}`);

      const detailRes = await fetchPage(url, sessionCookie);
      sessionCookie = updateCookies(sessionCookie, detailRes.headers['set-cookie']);
      const $detail = cheerio.load(detailRes.data);

      const detailIsLogin = isLoginPage($detail, detailRes.data);
      debugLog(`detailRes page length: ${detailRes.data?.length}, isLogin: ${detailIsLogin}`);

      if (detailIsLogin) {
        debugLog(`Error: detailRes returned login page (session expired)`);
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }

      const parsed = parseFeedbackPage(detailRes.data);
      debugLog(`parsed detail page. pending: ${parsed.pending.length}, completed: ${parsed.completed.length}`);

      const response = NextResponse.json({
        success: true,
        data: {
          title: parsed.title || `Feedback ${feedbackId}`,
          feedbackId,
          pending: parsed.pending,
          completed: parsed.completed,
          hasAcknowledgement: !!parsed.acknowledgementUrl,
        }
      });
      setUpdatedCookies(response, sessionCookie);
      return response;
    }

    // 3. Fetch list of feedback types (default case)
    const url = `${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedbacktypes`;
    const res = await fetchPage(url, sessionCookie);
    sessionCookie = updateCookies(sessionCookie, res.headers['set-cookie']);
    const $ = cheerio.load(res.data);

    if (isLoginPage($, res.data)) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
    }

    const feedbackTypes = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = cleanText($(el).text());
      if (href.includes('feedbackId=') && text) {
        const idMatch = href.match(/feedbackId=(\d+)/);
        let name = text;
        if (name.toLowerCase() === 'click here' || !name) {
          const container = $(el).closest('.uk-card, .card, .panel, div, td, tr');
          let heading = '';
          if (container.length > 0) {
            heading = cleanText(container.find('h1, h2, h3, h4, h5, h6, .uk-card-title, .card-title, .title, strong, b').first().text());
          }
          if (!heading) {
            let parent = $(el).parent();
            for (let depth = 0; depth < 3; depth++) {
              if (!parent.length) break;
              heading = cleanText(parent.find('h1, h2, h3, h4, h5, h6, strong, b').first().text());
              if (heading) break;
              parent = parent.parent();
            }
          }
          if (heading && heading.toLowerCase() !== 'click here') {
            name = heading;
          }
        }

        if (idMatch && idMatch[1] === '1') {
          return;
        }

        if (!name || name.toLowerCase() === 'click here') {
          name = `Feedback ${idMatch ? idMatch[1] : i + 1}`;
        }

        feedbackTypes.push({
          id: idMatch ? idMatch[1] : '',
          name: name,
          url: href,
        });
      }
    });

    const response = NextResponse.json({
      success: true,
      data: {
        feedbackTypes,
      }
    });
    setUpdatedCookies(response, sessionCookie);
    return response;

  } catch (error) {
    console.error('Feedback API error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch feedback data: ' + error.message }, { status: 500 });
  }
}

// POST handler
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const cookieStrings = [];

    cookieStore.getAll().forEach((cookie) => {
      if (cookie.name !== 'dashboard_url') {
        cookieStrings.push(`${cookie.name}=${cookie.value}`);
      }
    });

    let sessionCookie = cookieStrings.join('; ');
    const body = await request.json();
    const { feedbackId, ratingIndex = 0, formUrl } = body;

    debugLog(`POST request received. feedbackId=${feedbackId}, ratingIndex=${ratingIndex}, formUrl=${formUrl}, cookieStore.length=${cookieStore.getAll().length}`);
    debugLog(`sessionCookie to send: ${sessionCookie}`);

    if (!sessionCookie) {
      debugLog(`POST Error: sessionCookie is empty!`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (formUrl) {
      const fullFormUrl = getFullUrl(formUrl);
      console.log(`[Feedback] API: Submitting single form for: ${fullFormUrl}`);

      // Fetch the feedback form page
      const formPageRes = await fetchPage(fullFormUrl, sessionCookie);
      sessionCookie = updateCookies(sessionCookie, formPageRes.headers['set-cookie']);

      // Check if we landed on login page
      const $formPage = cheerio.load(formPageRes.data);
      if (isLoginPage($formPage, formPageRes.data)) {
        debugLog(`POST single Error: formPageRes returned login page (session expired)`);
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }

      const forms = $formPage('form');
      let form = null;
      forms.each((idx, el) => {
        const f = $formPage(el);
        if (f.find('input[type="radio"]').length > 0 || f.find('input[name="teacherId"]').length > 0) {
          form = f;
        }
      });

      if (!form) {
        debugLog(`POST single Error: feedback form not found on page`);
        return NextResponse.json({ error: 'Feedback form not found' }, { status: 404 });
      }

      const action = form.attr('action') || 'index.php?option=com_feedback&controller=feedbackentry';
      const postUrl = getFullUrl(action);

      const formData = new URLSearchParams();

      // Collect all hidden & text inputs
      form.find('input[type="hidden"], input[type="text"]').each((j, input) => {
        const name = $formPage(input).attr('name');
        const val = $formPage(input).attr('value') || '';
        if (name) {
          formData.append(name, val);
        }
      });

      // Collect all select options
      form.find('select').each((j, sel) => {
        const name = $formPage(sel).attr('name');
        const val = $formPage(sel).find('option[selected]').attr('value') || $formPage(sel).find('option').first().attr('value') || '';
        if (name) {
          formData.append(name, val);
        }
      });

      // Collect all textareas (remarks/comments)
      form.find('textarea').each((j, ta) => {
        const name = $formPage(ta).attr('name');
        if (name) {
          formData.append(name, "Excellent teaching, supportive, and covers syllabus thoroughly.");
        }
      });

      // Group radio buttons by name (to identify questions)
      const radioGroups = {};
      form.find('input[type="radio"]').each((j, radio) => {
        const name = $formPage(radio).attr('name');
        const val = $formPage(radio).attr('value') || '';
        if (name) {
          if (!radioGroups[name]) {
            radioGroups[name] = [];
          }
          radioGroups[name].push(val);
        }
      });

      // For each question (radio group), select the radio button at ratingIndex
      Object.entries(radioGroups).forEach(([name, values]) => {
        const selectedIdx = (ratingIndex >= 0 && ratingIndex < values.length) ? ratingIndex : 0;
        formData.append(name, values[selectedIdx]);
      });

      // Collect any submit buttons
      form.find('input[type="submit"], button[type="submit"]').each((j, btn) => {
        const name = $formPage(btn).attr('name');
        const val = $formPage(btn).attr('value') || 'Submit';
        if (name) {
          formData.append(name, val);
        }
      });

      // POST the form
      const postRes = await postForm(postUrl, formData.toString(), sessionCookie);
      sessionCookie = updateCookies(sessionCookie, postRes.headers['set-cookie']);

      // Check if submission landed on login page
      if (typeof postRes.data === 'string' && isLoginPage(cheerio.load(postRes.data), postRes.data)) {
        debugLog(`POST single Error: postRes returned login page (session expired)`);
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }

      if (postRes.status === 200 || postRes.status === 302) {
        const response = NextResponse.json({
          success: true,
          message: 'Submitted successfully',
        });
        setUpdatedCookies(response, sessionCookie);
        return response;
      } else {
        return NextResponse.json({ error: `Failed to submit feedback (status ${postRes.status})` }, { status: 500 });
      }
    }

    // 1. Fetch the feedback dashboard to find pending forms
    const listUrl = `${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedbacktypes`;
    debugLog(`POST: Fetching listUrl: ${listUrl}`);
    let res = await fetchPage(listUrl, sessionCookie);
    sessionCookie = updateCookies(sessionCookie, res.headers['set-cookie']);
    let $dash = cheerio.load(res.data);

    const listIsLogin = isLoginPage($dash, res.data);
    debugLog(`POST: listUrl page length: ${res.data?.length}, isLogin: ${listIsLogin}`);

    if (listIsLogin) {
      debugLog(`POST Error: listUrl returned login page (session expired)`);
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    let targetHref = '';
    $dash('a').each((i, el) => {
      const href = $dash(el).attr('href') || '';
      if (href.includes(`feedbackId=${feedbackId}`)) {
        targetHref = href;
      }
    });

    if (!targetHref) {
      targetHref = `?option=com_feedback&controller=feedbackentry&task=feedback&feedbackId=${feedbackId}`;
    }

    const dashUrl = getFullUrl(targetHref);
    debugLog(`POST: Fetching dashboard from: ${dashUrl}`);
    res = await fetchPage(dashUrl, sessionCookie);
    sessionCookie = updateCookies(sessionCookie, res.headers['set-cookie']);
    $dash = cheerio.load(res.data);

    const dashIsLogin = isLoginPage($dash, res.data);
    debugLog(`POST: dashUrl page length: ${res.data?.length}, isLogin: ${dashIsLogin}`);

    if (dashIsLogin) {
      debugLog(`POST Error: dashUrl returned login page (session expired)`);
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    let parsed = parseFeedbackPage(res.data);
    const totalPending = parsed.pending.length;
    debugLog(`POST: totalPending feedbacks to submit: ${totalPending}`);

    if (totalPending === 0) {
      debugLog(`POST Success: No pending feedbacks found.`);
      return NextResponse.json({
        success: true,
        message: 'No pending feedbacks found.',
        completedCount: 0,
      });
    }

    const log = [];
    let successCount = 0;
    console.log(`[Feedback] Starting automated submission for ${totalPending} pending feedbacks (feedbackId=${feedbackId})`);

    // 2. Submit feedback one at a time, re-fetching dashboard after each to get fresh URLs
    for (let i = 0; i < totalPending; i++) {
      try {
        // Re-fetch dashboard to get the FIRST pending link (fresh ksign URL)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800)); // polite delay
          res = await fetchPage(dashUrl, sessionCookie);
          sessionCookie = updateCookies(sessionCookie, res.headers['set-cookie']);
          $dash = cheerio.load(res.data);

          if (isLoginPage($dash, res.data)) {
            log.push(`Session expired after ${successCount} submissions`);
            console.log(`[Feedback] Session expired after ${successCount} submissions`);
            break;
          }

          parsed = parseFeedbackPage(res.data);
        }

        if (parsed.pending.length === 0) {
          log.push(`No more pending feedbacks found after ${successCount} submissions`);
          break;
        }

        // Always take the FIRST pending item (since previous one was just submitted)
        const currentItem = parsed.pending[0];
        const formUrl = getFullUrl(currentItem.url);

        console.log(`[Feedback] [${i + 1}/${totalPending}] Opening form for: ${currentItem.faculty}`);

        // Fetch the feedback form page
        const formPageRes = await fetchPage(formUrl, sessionCookie);
        sessionCookie = updateCookies(sessionCookie, formPageRes.headers['set-cookie']);

        // Check if we landed on login page
        const $formPage = cheerio.load(formPageRes.data);
        if (isLoginPage($formPage, formPageRes.data)) {
          log.push(`Session expired while opening form for ${currentItem.faculty}`);
          console.log(`[Feedback] Session expired while opening form for ${currentItem.faculty}`);
          break;
        }

        const forms = $formPage('form');
        let form = null;
        forms.each((idx, el) => {
          const f = $formPage(el);
          if (f.find('input[type="radio"]').length > 0 || f.find('input[name="teacherId"]').length > 0) {
            form = f;
          }
        });

        if (!form) {
          log.push(`Form not found for ${currentItem.faculty}`);
          console.log(`[Feedback] Form not found for ${currentItem.faculty}. Page length: ${formPageRes.data.length}`);
          continue;
        }

        const action = form.attr('action') || 'index.php?option=com_feedback&controller=feedbackentry';
        const postUrl = getFullUrl(action);

        const formData = new URLSearchParams();

        // Collect all hidden & text inputs
        form.find('input[type="hidden"], input[type="text"]').each((j, input) => {
          const name = $formPage(input).attr('name');
          const val = $formPage(input).attr('value') || '';
          if (name) {
            formData.append(name, val);
          }
        });

        // Collect all select options
        form.find('select').each((j, sel) => {
          const name = $formPage(sel).attr('name');
          const val = $formPage(sel).find('option[selected]').attr('value') || $formPage(sel).find('option').first().attr('value') || '';
          if (name) {
            formData.append(name, val);
          }
        });

        // Collect all textareas (remarks/comments)
        form.find('textarea').each((j, ta) => {
          const name = $formPage(ta).attr('name');
          if (name) {
            formData.append(name, "Excellent teaching, supportive, and covers syllabus thoroughly.");
          }
        });

        // Group radio buttons by name (to identify questions)
        const radioGroups = {};
        form.find('input[type="radio"]').each((j, radio) => {
          const name = $formPage(radio).attr('name');
          const val = $formPage(radio).attr('value') || '';
          if (name) {
            if (!radioGroups[name]) {
              radioGroups[name] = [];
            }
            radioGroups[name].push(val);
          }
        });

        // For each question (radio group), select the radio button at ratingIndex
        Object.entries(radioGroups).forEach(([name, values]) => {
          const selectedIdx = (ratingIndex >= 0 && ratingIndex < values.length) ? ratingIndex : 0;
          formData.append(name, values[selectedIdx]);
        });

        // Collect any submit buttons
        form.find('input[type="submit"], button[type="submit"]').each((j, btn) => {
          const name = $formPage(btn).attr('name');
          const val = $formPage(btn).attr('value') || 'Submit';
          if (name) {
            formData.append(name, val);
          }
        });

        console.log(`[Feedback] [${i + 1}/${totalPending}] Submitting form to ${postUrl.substring(0, 80)}... (${Object.keys(radioGroups).length} questions)`);

        // POST the form
        const postRes = await postForm(postUrl, formData.toString(), sessionCookie);
        sessionCookie = updateCookies(sessionCookie, postRes.headers['set-cookie']);

        // Check if submission landed on login page
        if (typeof postRes.data === 'string' && isLoginPage(cheerio.load(postRes.data), postRes.data)) {
          log.push(`Session expired during form submission for ${currentItem.faculty}`);
          console.log(`[Feedback] Session expired during form submission`);
          break;
        }

        if (postRes.status === 200 || postRes.status === 302) {
          successCount++;
          log.push(`Submitted feedback for ${currentItem.faculty}`);
          console.log(`[Feedback] [${i + 1}/${totalPending}] ✓ Submitted successfully for ${currentItem.faculty}`);
        } else {
          log.push(`Failed for ${currentItem.faculty} (status ${postRes.status})`);
          console.log(`[Feedback] [${i + 1}/${totalPending}] ✗ Failed with status ${postRes.status}`);
        }

      } catch (err) {
        log.push(`Error: ${err.message}`);
        console.error(`[Feedback] Error in submission loop:`, err.message);
      }
    }

    const response = NextResponse.json({
      success: true,
      completedCount: successCount,
      totalCount: totalPending,
      log,
    });
    setUpdatedCookies(response, sessionCookie);
    return response;

  } catch (error) {
    console.error('Feedback submit error:', error.message);
    return NextResponse.json({ error: 'Failed to submit feedbacks: ' + error.message }, { status: 500 });
  }
}
