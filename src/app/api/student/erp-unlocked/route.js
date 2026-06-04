import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 5,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';
const cleanText = (value) => value?.replace(/\s+/g, ' ').trim() || '';

async function fetchPage(url, sessionCookie) {
  const res = await axios.get(url, {
    httpsAgent,
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': sessionCookie,
    },
    maxRedirects: 3,
    validateStatus: () => true,
  });
  return res;
}

function isLoginPage($, html) {
  return $('input[name="username"]').length > 0 || (html || '').includes('Login to Your Account');
}

// ═══════════════════════════════════════════════════════
// Scraper: Proctorial Notes (task=observation)
// ═══════════════════════════════════════════════════════
async function scrapeProctorialNotes(sessionCookie) {
  try {
    const url = `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=observation`;
    const res = await fetchPage(url, sessionCookie);
    const $ = cheerio.load(res.data);
    if (isLoginPage($, res.data)) return null;

    const notes = [];
    // Extract proctorial notes from the tables/content
    $('table').each((i, table) => {
      const rows = [];
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('th, td').map((k, cell) => cleanText($(cell).text())).get();
        if (cells.length > 0 && cells.some(c => c.length > 0)) rows.push(cells);
      });
      if (rows.length > 0) notes.push(rows);
    });

    // Extract any heading or content that indicates the proctor
    const headings = [];
    $('h1, h2, h3, h4, h5').each((i, el) => {
      const text = cleanText($(el).text());
      if (text.length > 3 && text.length < 100 && !text.includes('Contineo')) headings.push(text);
    });

    // Extract any paragraph content
    const paragraphs = [];
    $('p, .observation-text, .proctor-note, .note-content, .uk-card-body p').each((i, el) => {
      const text = cleanText($(el).text());
      if (text.length > 5 && !text.includes('Copyright') && !text.includes('Powered By')) {
        paragraphs.push(text);
      }
    });

    const bodyText = cleanText($('body').text());

    return {
      headings,
      notes,
      paragraphs,
      rawSnippet: bodyText.substring(0, 500),
    };
  } catch (err) {
    console.error('Proctorial scrape error:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// Scraper: Timetable with Faculty Names (task=timetable)
// ═══════════════════════════════════════════════════════
async function scrapeTimetableWithFaculty(sessionCookie) {
  try {
    const url = `${BASE_URL}?option=com_studentdashboard&controller=studentdashboard&task=timetable`;
    const res = await fetchPage(url, sessionCookie);
    const $ = cheerio.load(res.data);
    if (isLoginPage($, res.data)) return null;

    const days = [];
    const facultySet = new Map(); // courseCode → Set of faculty names

    // Each day's timetable is in a separate table
    $('table').each((i, table) => {
      const rows = [];
      const headers = [];

      $(table).find('tr').first().find('th, td').each((j, cell) => {
        headers.push(cleanText($(cell).text()).toUpperCase());
      });

      // Check if this is a timetable table (has Time, Course, Faculty headers)
      const hasTimeHeader = headers.some(h => h.includes('TIME'));
      const hasCourseHeader = headers.some(h => h.includes('COURSE'));
      if (!hasTimeHeader && !hasCourseHeader && headers.length < 3) return;

      $(table).find('tr').each((j, row) => {
        if (j === 0 && hasTimeHeader) return; // Skip header row

        const cells = $(row).find('th, td').map((k, cell) => cleanText($(cell).text())).get();
        if (cells.length < 2) return;

        // Parse time, course, faculty from each row
        const time = cells[0] || '';
        const courseRaw = cells[1] || '';
        const faculty = cells[2] || '';
        const room = cells[3] || '';
        const batch = cells[4] || '';

        // Extract course code and name
        const codeMatch = courseRaw.match(/^([A-Z0-9_]+)\s*-\s*(.+)$/i);
        const courseCode = codeMatch ? codeMatch[1].trim() : '';
        const courseName = codeMatch ? codeMatch[2].trim() : courseRaw;

        if (time && courseCode) {
          rows.push({ time, courseCode, courseName, faculty, room, batch });

          // Build faculty mapping
          if (courseCode && faculty) {
            if (!facultySet.has(courseCode)) {
              facultySet.set(courseCode, new Set());
            }
            // Faculty field may contain multiple names separated by commas
            faculty.split(',').forEach(f => {
              const name = f.trim();
              if (name && name.length > 2) {
                facultySet.get(courseCode).add(name);
              }
            });
          }
        }
      });

      if (rows.length > 0) {
        // Try to find the day name from a heading before this table
        let dayName = '';
        const prevEl = $(table).prev('h1, h2, h3, h4, h5, p, div, caption');
        if (prevEl.length) {
          const text = cleanText(prevEl.text());
          const dayMatch = text.match(/(?:Timetable\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*(\d{2}-\d{2}-\d{4})?/i);
          if (dayMatch) {
            dayName = dayMatch[1];
            const dateStr = dayMatch[2] || '';
            days.push({ day: dayName, date: dateStr, slots: rows });
          } else {
            days.push({ day: '', date: '', slots: rows });
          }
        } else {
          days.push({ day: '', date: '', slots: rows });
        }
      }
    });

    // Also try to extract day names from inline heading text
    const bodyText = cleanText($('body').text());
    const dayMatches = [...bodyText.matchAll(/Timetable\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{2}-\d{2}-\d{4})/gi)];
    
    // Build course→faculty mapping
    const courseFaculty = {};
    for (const [courseCode, names] of facultySet) {
      courseFaculty[courseCode] = [...names];
    }

    // Previous/Next week URLs
    let prevWeekUrl = '';
    let nextWeekUrl = '';
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = cleanText($(el).text());
      if (text.includes('Previous') && href.includes('type=prev')) {
        prevWeekUrl = href;
      }
      if (text.includes('Next') && href.includes('type=next')) {
        nextWeekUrl = href;
      }
    });

    return {
      days,
      courseFaculty,
      prevWeekUrl,
      nextWeekUrl,
    };
  } catch (err) {
    console.error('Timetable scrape error:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// Scraper: Feedback Forms (com_feedback)
// ═══════════════════════════════════════════════════════
async function scrapeFeedbackDashboard(sessionCookie) {
  try {
    const url = `${BASE_URL}?option=com_feedback&controller=feedbackentry&task=feedbacktypes`;
    const res = await fetchPage(url, sessionCookie);
    const $ = cheerio.load(res.data);
    if (isLoginPage($, res.data)) return null;

    const feedbackTypes = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = cleanText($(el).text());
      if (href.includes('feedbackId=') && text) {
        const idMatch = href.match(/feedbackId=(\d+)/);
        feedbackTypes.push({
          id: idMatch ? idMatch[1] : '',
          name: text,
          url: href,
        });
      }
    });

    const headings = [];
    $('h1, h2, h3, h4, h5').each((i, el) => {
      const text = cleanText($(el).text());
      if (text.length > 3 && text.length < 120 && !text.includes('Contineo')) {
        headings.push(text);
      }
    });

    return { feedbackTypes, headings };
  } catch (err) {
    console.error('Feedback scrape error:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// Scraper: Hidden Exam / Revaluation Dashboards
// ═══════════════════════════════════════════════════════
async function scrapeHiddenDashboards(sessionCookie) {
  const endpoints = [
    { key: 'examRegistration', label: 'Exam Registration', url: `${BASE_URL}?option=com_exam&task=dashboard.studcoursereg` },
    { key: 'cieEvaluation', label: 'CIE Evaluation', url: `${BASE_URL}?option=com_eexam&task=ceval.cevaldashboard` },
    { key: 'revaluation', label: 'Revaluation', url: `${BASE_URL}?option=com_eexam&task=reval.revaldashboard` },
  ];

  const results = {};

  for (const endpoint of endpoints) {
    try {
      const res = await fetchPage(endpoint.url, sessionCookie);
      const $ = cheerio.load(res.data);
      
      if (isLoginPage($, res.data) || res.data.length < 200) {
        results[endpoint.key] = { available: false, label: endpoint.label };
        continue;
      }

      const bodyText = cleanText($('body').text());
      const is404 = bodyText.includes('404') || bodyText.includes('Component not found');
      const is500 = bodyText.includes('500') || bodyText.includes('View not found');
      
      if (is404 || is500) {
        results[endpoint.key] = { available: false, label: endpoint.label };
        continue;
      }

      // Extract any tables
      const tables = [];
      $('table').each((i, table) => {
        const rows = [];
        $(table).find('tr').each((j, row) => {
          const cells = $(row).find('th, td').map((k, cell) => cleanText($(cell).text())).get();
          if (cells.length > 0 && cells.some(c => c.length > 0)) rows.push(cells);
        });
        if (rows.length > 0) tables.push(rows);
      });

      const headings = [];
      $('h1, h2, h3, h4, h5').each((i, el) => {
        const text = cleanText($(el).text());
        if (text.length > 3 && text.length < 100 && !text.includes('Contineo')) headings.push(text);
      });

      // Check for any actionable buttons/forms
      const actions = [];
      $('button, input[type="submit"], a.btn, a.uk-button').each((i, el) => {
        const text = cleanText($(el).text());
        if (text.length > 1 && text.length < 60) actions.push(text);
      });

      results[endpoint.key] = {
        available: true,
        label: endpoint.label,
        headings,
        tables,
        actions,
        contentSize: bodyText.length,
        snippet: bodyText.substring(0, 300),
      };
    } catch (err) {
      results[endpoint.key] = { available: false, label: endpoint.label, error: err.message };
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════
// Scraper: Notes / Lesson Plans
// ═══════════════════════════════════════════════════════
async function scrapeNotesPage(sessionCookie, semId, secId, courseId, deptId, streamId) {
  try {
    const url = `${BASE_URL}?option=com_bvbsims&controller=uploadlession&task=getuploadlession&semId=${semId}&secId=${secId}&courseId=${courseId}&deptId=${deptId || ''}&streamId=${streamId || ''}`;
    const res = await fetchPage(url, sessionCookie);
    const $ = cheerio.load(res.data);
    if (isLoginPage($, res.data)) return null;

    const bodyText = cleanText($('body').text());
    
    // Extract course info
    const courseInfo = {};
    $('table').first().find('tr').each((i, row) => {
      const cells = $(row).find('td, th').map((j, cell) => cleanText($(cell).text())).get();
      cells.forEach(cell => {
        const kvMatch = cell.match(/^(.+?):\s*(.+)$/);
        if (kvMatch) {
          courseInfo[kvMatch[1].trim().toLowerCase()] = kvMatch[2].trim();
        }
      });
    });

    // Find downloadable lesson plan files
    const files = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = cleanText($(el).text());
      if (href.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)/i) || text.match(/download|lesson|plan|file|material/i)) {
        files.push({ name: text || 'Download', url: href });
      }
    });

    return { courseInfo, files, hasContent: bodyText.length > 500 };
  } catch (err) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// Main GET handler
// ═══════════════════════════════════════════════════════
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

    // Scrape all hidden pages in parallel
    const [proctorial, timetable, feedback, hiddenDashboards] = await Promise.all([
      scrapeProctorialNotes(sessionCookie),
      scrapeTimetableWithFaculty(sessionCookie),
      scrapeFeedbackDashboard(sessionCookie),
      scrapeHiddenDashboards(sessionCookie),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        proctorial,
        timetable,
        feedback,
        hiddenDashboards,
        discoveredAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('ERP Unlocked Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch unlocked data' }, { status: 500 });
  }
}
