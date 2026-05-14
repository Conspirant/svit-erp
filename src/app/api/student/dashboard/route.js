import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { setSessionIdentity } from '@/lib/authSession';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 10,
});

const BASE_URL = 'https://svit-students.accredia.in:8084/index.php';

const readBracketCount = (text, label) => {
  const match = text.match(new RegExp(`${label}\\s*\\[\\s*(\\d+)\\s*\\]`, 'i'));
  return match ? parseInt(match[1], 10) : 0;
};

const cleanText = (value) => value?.replace(/\s+/g, ' ').trim() || '';

const extractCourseName = ($, courseCode) => {
  const escapedCourse = courseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pageText = cleanText($('body').text());
  const courseLine = pageText.match(new RegExp(`${escapedCourse}\\s*-\\s*([^\\n]+?)(?:\\s{2,}|Attendance Status|Present\\[|$)`, 'i'));
  if (courseLine?.[1]) return cleanText(courseLine[1]);

  const activeTooltip = $(`a:contains("${courseCode}")`).closest('[uk-tooltip]').attr('uk-tooltip');
  const tooltipName = activeTooltip?.match(/title:\s*([^;]+)/i)?.[1];
  return cleanText(tooltipName);
};

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cookieStrings = [];
    
    // Reconstruct the cookie string
    cookieStore.getAll().forEach((cookie) => {
      if (cookie.name !== 'dashboard_url') {
        cookieStrings.push(`${cookie.name}=${cookie.value}`);
      }
    });

    const sessionCookie = cookieStrings.join('; ');

    const dashboardUrlCookie = cookieStore.get('dashboard_url');
    const targetUrl = dashboardUrlCookie ? dashboardUrlCookie.value : BASE_URL;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const res = await axios.get(targetUrl, {
      httpsAgent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': sessionCookie,
      },
    });

    const $ = cheerio.load(res.data);
    
    // Check if we are actually logged in
    if ($('form#login-form').length > 0 || res.data.includes('Login to Your Account')) {
       return NextResponse.json({ error: 'Session expired or not logged in' }, { status: 401 });
    }

    const stats = {
      profileName: $('h3.profile-name, .user-name').text().trim() || 'Student',
      pageTitle: $('title').text().trim(),
      // Extract generic tables to find attendance/marks
      tablesData: [],
      // Grab all text from potential metric cards
      metrics: []
    };

    const attendanceLinks = [];
    const courseNames = new Map();

    $('table').each((i, table) => {
        const tableData = [];
        $(table).find('tr').each((j, row) => {
            const rowData = [];
            $(row).find('th, td').each((k, cell) => {
                rowData.push($(cell).text().trim().replace(/\s+/g, ' '));
                
                // Extract attendance link if present
                const link = $(cell).find('a').attr('href');
                if (link && link.includes('task=attendencelist')) {
                   // Course code is usually the first td
                   const cells = $(row).find('td');
                   const courseCode = cleanText(cells.first().text());
                   const courseName = cleanText(cells.eq(1).text());
                   if (courseCode && courseName) courseNames.set(courseCode, courseName);
                   attendanceLinks.push({ course: courseCode, courseName, url: `https://svit-students.accredia.in:8084/${link}` });
                }
            });
            if (rowData.length > 0) tableData.push(rowData);
        });
        if (tableData.length > 0) stats.tablesData.push(tableData);
    });

    // Extract Attendance and CIE from inline scripts
    stats.attendance = [];
    stats.cie = [];
    
    const scripts = $('script').map((i, el) => $(el).html()).get();
    
    const attendanceScript = scripts.find(s => s && s.includes('type: "gauge"'));
    if (attendanceScript) {
        const matches = [...attendanceScript.matchAll(/\[\s*"([^"]+)"\s*,\s*([0-9.]+)\s*\]/g)];
        matches.forEach(m => {
            stats.attendance.push({
                course: m[1],
                courseName: courseNames.get(m[1]) || '',
                percentage: parseFloat(m[2]),
                present: 0,
                absent: 0,
                total: 0,
                stillToGo: 0
            });
        });
    }

    // Fetch Detailed Attendance asynchronously
    if (attendanceLinks.length > 0) {
        try {
            const detailedRequests = attendanceLinks.map(linkObj => 
                axios.get(linkObj.url, {
                    httpsAgent,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Cookie': sessionCookie }
                }).then(res => {
                    const _$ = cheerio.load(res.data);
                    const pageText = _$('body').text().replace(/\s+/g, ' ');
                    const presentMatch = _$('.cn-legend .cn-color-green').text().match(/\[(\d+)\]/);
                    const absentMatch = _$('.cn-legend .cn-color-red').text().match(/\[(\d+)\]/);
                    const stillToGoMatch = pageText.match(/STILL\s+TO\s+GO\s*\[\s*(\d+)\s*\]/i);
                    
                    const present = presentMatch ? parseInt(presentMatch[1], 10) : readBracketCount(pageText, 'PRESENT');
                    const absent = absentMatch ? parseInt(absentMatch[1], 10) : readBracketCount(pageText, 'ABSENT');
                    const stillToGo = stillToGoMatch ? parseInt(stillToGoMatch[1], 10) : readBracketCount(pageText, 'STILL\\s+TO\\s+GO');
                    const courseName = linkObj.courseName || extractCourseName(_$, linkObj.course);
                    
                    const dates = [];
                    _$('.cn-attend-list1 tbody tr').each((i, row) => {
                        const cols = _$(row).find('td');
                        if (cols.length >= 4) {
                            dates.push({
                                date: _$(cols[1]).text().trim(),
                                time: _$(cols[2]).text().trim().replace(/\\s+/g, ' '),
                                status: 'Present'
                            });
                        }
                    });

                    _$('.cn-attend-list2 tbody tr').each((i, row) => {
                        const cols = _$(row).find('td');
                        if (cols.length >= 4) {
                            dates.push({
                                date: _$(cols[1]).text().trim(),
                                time: _$(cols[2]).text().trim().replace(/\\s+/g, ' '),
                                status: 'Absent'
                            });
                        }
                    });

                    dates.sort((a, b) => {
                        const parseD = (d) => {
                            const p = d.split('-');
                            return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime() : 0;
                        };
                        return parseD(a.date) - parseD(b.date);
                    });
                    
                    return { course: linkObj.course, courseName, present, absent, total: present + absent, stillToGo, dates };
                }).catch(() => null)
            );
            
            const detailedResults = await Promise.all(detailedRequests);
            
            // Merge into stats.attendance
            detailedResults.forEach(detail => {
                if(detail) {
                    const match = stats.attendance.find(a => a.course === detail.course);
                    if(match) {
                        match.present = detail.present;
                        match.absent = detail.absent;
                        match.total = detail.total;
                        match.stillToGo = detail.stillToGo;
                        match.courseName = detail.courseName || match.courseName;
                        match.dates = detail.dates;
                    }
                }
            });
        } catch (e) {
            console.error('Failed to fetch detailed attendance:', e.message);
        }
    }

    const cieScript = scripts.find(s => s && s.includes('type: "bar"'));
    if (cieScript) {
        const matches = [...cieScript.matchAll(/\[\s*"([^"]+)"\s*,\s*([0-9.]+)\s*\]/g)];
        matches.forEach(m => {
            stats.cie.push({ course: m[1], courseName: courseNames.get(m[1]) || '', marks: parseFloat(m[2]) });
        });
    }

    // Try to get profile name
    stats.profileName = $('.cn-user-name, .profile-name').first().text().trim() || 'Student';
    // Fallback if the name is in a specific div (often inside a user profile block)
    if (stats.profileName === 'Student') {
       const possibleNames = $('h1, h2, h3, h4, .uk-h3, .uk-h4').map((i, el) => $(el).text().trim()).get();
       // Try to guess which one is the name (usually all caps or camel case, not long sentences)
       const goodName = possibleNames.find(n => n.length > 3 && n.length < 30 && !n.includes('Welcome') && !n.includes('Contineo'));
       if (goodName) stats.profileName = goodName;
    }

    // Extract Student Info
    const fullPageText = $('body').text().replace(/\s+/g, ' ');
    const usnMatch = fullPageText.match(/USN\s*:\s*(1[a-z0-9]{9})/i) || fullPageText.match(/(1[a-z]{2}\d{2}[a-z]{2}\d{3})/i);
    if (usnMatch) stats.usn = usnMatch[1].toUpperCase();
    else stats.usn = '';

    let department = '';
    const deptMatch = fullPageText.match(/Department\s*:\s*(.*?)(?=Semester|Category|Quota|$)/i);
    if (deptMatch) {
       department = deptMatch[1].trim();
    } else {
       // Fallback to the header text pattern e.g., "B.E-CD, SEM 02, SEC F"
       const headerMatch = fullPageText.match(/([A-Za-z.\-]+)\s*,\s*SEM\s*0?\d+/i);
       if (headerMatch) {
           department = headerMatch[1].trim();
       }
    }
    stats.department = department;

    const semMatch = fullPageText.match(/Semester\s*:\s*(\d+)/i) || fullPageText.match(/SEM\s*0?(\d+)/i);
    if (semMatch) stats.semester = semMatch[1];
    else stats.semester = '';

    // Try to find generic metric cards or panels
    $('.uk-card, .panel, .widget').each((i, el) => {
        stats.metrics.push($(el).text().replace(/\s+/g, ' ').trim());
    });

    const response = NextResponse.json({ success: true, data: stats, rawHtmlLength: res.data.length });
    setSessionIdentity(response, { usn: stats.usn, name: stats.profileName });
    return response;

  } catch (error) {
    console.error('Dashboard Scraper Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
