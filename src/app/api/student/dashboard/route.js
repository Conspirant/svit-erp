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

const normalizeHeader = (value) => cleanText(value).toUpperCase().replace(/\s+/g, ' ');

const parseMarks = (value) => {
    const text = cleanText(value);
    if (!text || text === '-') return { obtained: null, max: null };

    const fraction = text.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
    if (fraction) {
        return {
            obtained: parseFloat(fraction[1]),
            max: parseFloat(fraction[2]),
        };
    }

    const number = parseFloat(text);
    return {
        obtained: Number.isFinite(number) ? number : null,
        max: null,
    };
};

const emptyBreakdown = () => ({
    ia1: { obtained: null, max: null },
    ia2: { obtained: null, max: null },
    lab1: { obtained: null, max: null },
    lab2: { obtained: null, max: null },
    assign1: { obtained: null, max: null },
    assign2: { obtained: null, max: null },
    finalIA: { obtained: null, max: null },
    attendance: '',
});

const hasBreakdownMarks = (breakdown) => Object.values({
    ia1: breakdown?.ia1,
    ia2: breakdown?.ia2,
    lab1: breakdown?.lab1,
    lab2: breakdown?.lab2,
    assign1: breakdown?.assign1,
    assign2: breakdown?.assign2,
    finalIA: breakdown?.finalIA,
}).some((mark) => mark?.obtained !== null && mark?.obtained !== undefined);

const parseCieDetailPage = (html, fallback = {}) => {
    const _$ = cheerio.load(html);
    const pageText = cleanText(_$('body').text());
    const heading = cleanText(_$('h1, h2, h3, .page-head-line, .uk-card-title').filter((i, el) => {
        const text = cleanText(_$(el).text());
        return /IA1|FINAL IA|[A-Z0-9]+\)/i.test(text) && text.length > 8;
    }).first().text());
    const subjectText = heading || cleanText(_$('body').find('*').filter((i, el) => {
        const text = cleanText(_$(el).text());
        return /\([A-Z0-9_]+\)/i.test(text) && text.length < 120;
    }).first().text());
    const codeMatch = subjectText.match(/\(\s*([A-Z0-9_]+)\s*\)/i);
    const course = (codeMatch?.[1] || fallback.course || '').toUpperCase();
    const courseName = cleanText(
        subjectText.replace(/\(\s*[A-Z0-9_]+\s*\)/i, '') ||
        fallback.courseName ||
        ''
    );

    let bestBreakdown = null;

    _$('table').each((i, table) => {
        const rows = [];
        _$(table).find('tr').each((j, row) => {
            const cells = _$(row).find('th, td').map((k, cell) => cleanText(_$(cell).text())).get();
            if (cells.length) rows.push(cells);
        });

        if (rows.length < 2) return;

        const headerIndex = rows.findIndex((row) => {
            const joined = normalizeHeader(row.join(' '));
            return joined.includes('IA1') && joined.includes('FINAL IA');
        });

        if (headerIndex === -1 || !rows[headerIndex + 1]) return;

        const headers = rows[headerIndex].map(normalizeHeader);
        const values = rows.slice(headerIndex + 1).find((row) => (
            row.some((cell) => /\d+\s*\/\s*\d+|%|-/.test(cell))
        ));

        if (!values) return;

        const rowData = {};
        values.forEach((value, index) => {
            const header = headers[index];
            if (header) rowData[header] = value;
        });

        const breakdown = emptyBreakdown();
        breakdown.ia1 = parseMarks(rowData['IA1'] || rowData['IA 1']);
        breakdown.ia2 = parseMarks(rowData['IA2'] || rowData['IA 2']);
        breakdown.lab1 = parseMarks(rowData['LAB1'] || rowData['LAB 1']);
        breakdown.lab2 = parseMarks(rowData['LAB2'] || rowData['LAB 2']);
        breakdown.assign1 = parseMarks(rowData['ASSIGN1'] || rowData['ASSIGN 1'] || rowData['ASSIGNMENT1'] || rowData['ASSIGNMENT 1']);
        breakdown.assign2 = parseMarks(rowData['ASSIGN2'] || rowData['ASSIGN 2'] || rowData['ASSIGNMENT2'] || rowData['ASSIGNMENT 2']);
        breakdown.finalIA = parseMarks(rowData['FINAL IA'] || rowData['FINALIA']);
        breakdown.attendance = rowData['ATTENDANCE'] || '';

        if (hasBreakdownMarks(breakdown)) bestBreakdown = breakdown;
    });

    if (!bestBreakdown) {
        const labels = {
            ia1: /IA1\s+(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)/i,
            ia2: /IA2\s+(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)/i,
            lab1: /LAB1\s+(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)/i,
            lab2: /LAB2\s+(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)/i,
            assign1: /ASSIGN(?:MENT)?\s*1\s+(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)/i,
            assign2: /ASSIGN(?:MENT)?\s*2\s+(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)/i,
            finalIA: /FINAL\s+IA\s+(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)/i,
        };
        bestBreakdown = emptyBreakdown();
        Object.entries(labels).forEach(([key, pattern]) => {
            const match = pageText.match(pattern);
            if (match) bestBreakdown[key] = parseMarks(match[1]);
        });
        const attendanceMatch = pageText.match(/ATTENDANCE\s+(\d+(?:\.\d+)?%)/i);
        if (attendanceMatch) bestBreakdown.attendance = attendanceMatch[1];
    }

    if (!hasBreakdownMarks(bestBreakdown)) return null;

    return {
        course,
        courseName,
        marks: bestBreakdown.finalIA.obtained ?? bestBreakdown.ia1.obtained ?? 0,
        maxMarks: bestBreakdown.finalIA.max ?? bestBreakdown.ia1.max ?? null,
        breakdown: bestBreakdown,
    };
};

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
        const cieLinks = [];
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

                    if (link && link.includes('task=ciedetails')) {
                        const cells = $(row).find('td');
                        const courseCode = cleanText(cells.first().text());
                        const courseName = cleanText(cells.eq(1).text());
                        if (courseCode && courseName) courseNames.set(courseCode, courseName);
                        cieLinks.push({ course: courseCode, courseName, url: `https://svit-students.accredia.in:8084/${link}` });
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
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Cookie': sessionCookie }
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
                    if (detail) {
                        const match = stats.attendance.find(a => a.course === detail.course);
                        if (match) {
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

        if (cieLinks.length > 0) {
            try {
                const cieRequests = cieLinks.map((linkObj) =>
                    axios.get(linkObj.url, {
                        httpsAgent,
                        timeout: 15000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Cookie': sessionCookie }
                    }).then((detailRes) => parseCieDetailPage(detailRes.data, linkObj)).catch(() => null)
                );

                const cieDetails = await Promise.all(cieRequests);
                cieDetails.filter(Boolean).forEach((detail) => {
                    const existing = stats.cie.find((item) => item.course === detail.course);
                    if (existing) {
                        existing.courseName = detail.courseName || existing.courseName;
                        existing.marks = detail.marks;
                        existing.maxMarks = detail.maxMarks;
                        existing.breakdown = detail.breakdown;
                    } else {
                        stats.cie.push(detail);
                    }
                });
            } catch (e) {
                console.error('Failed to fetch detailed CIE:', e.message);
            }
        }

        // Extract detailed CIE table data (IA1, IA2, Lab1/Lab2 or Assign1/Assign2, Final IA, Attendance)
        // The ERP page has per-subject tables with values like: 39/40 | - | - | - | 24/50 | 100%
        try {
            $('table').each((i, table) => {
                const headers = [];
                $(table).find('th').each((j, th) => {
                    headers.push(normalizeHeader($(th).text()));
                });

                // Check if this table has CIE-related headers
                const hasIA = headers.some(h => h.includes('IA1') || h.includes('IA2') || h.includes('FINAL IA'));
                if (!hasIA) return;

                // Find the subject name from the closest heading or caption
                let subjectText = '';
                const prevHeading = $(table).prevAll('h1, h2, h3, h4, h5').first();
                if (prevHeading.length) {
                    subjectText = prevHeading.text().trim();
                } else {
                    const parentCaption = $(table).closest('.uk-card, .panel, section').find('h1, h2, h3, h4, h5, caption').first();
                    if (parentCaption.length) subjectText = parentCaption.text().trim();
                }

                // Extract course code from subject text, e.g., "QUANTUM PHYSICS AND APPLICATIONS( 1BPHYS202)"
                const codeMatch = subjectText.match(/\(\s*([A-Z0-9]+)\s*\)/i);
                const courseCode = codeMatch ? codeMatch[1].toUpperCase() : '';
                const subjectName = subjectText.replace(/\(\s*[A-Z0-9]+\s*\)/i, '').trim();

                $(table).find('tbody tr, tr').each((j, row) => {
                    const cells = $(row).find('td');
                    if (cells.length < 2) return;

                    // Map each cell to its header
                    const rowData = {};
                    cells.each((k, cell) => {
                        const header = headers[k] || '';
                        const value = cleanText($(cell).text());
                        if (header) rowData[header] = value;
                    });

                    // Build detailed breakdown
                    const breakdown = {
                        ia1: parseMarks(rowData['IA1'] || rowData['IA 1']),
                        ia2: parseMarks(rowData['IA2'] || rowData['IA 2']),
                        lab1: parseMarks(rowData['LAB1'] || rowData['LAB 1']),
                        lab2: parseMarks(rowData['LAB2'] || rowData['LAB 2']),
                        assign1: parseMarks(rowData['ASSIGN1'] || rowData['ASSIGN 1'] || rowData['ASSIGNMENT1'] || rowData['ASSIGNMENT 1']),
                        assign2: parseMarks(rowData['ASSIGN2'] || rowData['ASSIGN 2'] || rowData['ASSIGNMENT2'] || rowData['ASSIGNMENT 2']),
                        finalIA: parseMarks(rowData['FINAL IA'] || rowData['FINALIA']),
                        attendance: rowData['ATTENDANCE'] || '',
                    };

                    // Find matching CIE entry and attach breakdown, or create new entry
                    if (courseCode) {
                        const existing = stats.cie.find(c => c.course === courseCode);
                        if (existing) {
                            if (!hasBreakdownMarks(existing.breakdown)) existing.breakdown = breakdown;
                            existing.maxMarks = existing.maxMarks ?? breakdown.finalIA.max;
                            existing.courseName = existing.courseName || subjectName;
                        } else {
                            stats.cie.push({
                                course: courseCode,
                                courseName: subjectName,
                                marks: breakdown.finalIA.obtained ?? 0,
                                maxMarks: breakdown.finalIA.max,
                                breakdown,
                            });
                        }
                    } else if (stats.cie.length > 0) {
                        // If no course code found in heading, try matching by index
                        const unmatched = stats.cie.filter(c => !c.breakdown);
                        if (unmatched.length > 0) {
                            unmatched[0].breakdown = breakdown;
                        }
                    }
                });
            });
        } catch (e) {
            console.error('CIE table scraping error:', e.message);
        }

        // Deduplicate & merge duplicate attendance and CIE entries (Teacher mishap preventer)
        if (stats.attendance && stats.attendance.length > 0) {
            const finalAttendance = [];
            const attMap = new Map();

            stats.attendance.forEach(item => {
                const key = item.course.toUpperCase();
                if (!attMap.has(key)) {
                    attMap.set(key, []);
                }
                attMap.get(key).push(item);
            });

            for (const [courseKey, list] of attMap.entries()) {
                const allDates = [];
                let maxStillToGo = 0;
                let courseName = '';
                
                list.forEach(item => {
                    if (item.dates) {
                        allDates.push(...item.dates);
                    }
                    if (item.stillToGo > maxStillToGo) {
                        maxStillToGo = item.stillToGo;
                    }
                    if (item.courseName && !courseName) {
                        courseName = item.courseName;
                    }
                });

                // Deduplicate dates by date + time
                const seenDates = new Set();
                const uniqueDates = [];
                allDates.forEach(d => {
                    const key = `${d.date}_${d.time}`;
                    if (!seenDates.has(key)) {
                        seenDates.add(key);
                        uniqueDates.push(d);
                    }
                });

                // Sort dates chronologically
                uniqueDates.sort((a, b) => {
                    const parseD = (d) => {
                        const p = d.split('-');
                        return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime() : 0;
                    };
                    return parseD(a.date) - parseD(b.date);
                });

                const present = uniqueDates.filter(d => d.status === 'Present').length;
                const absent = uniqueDates.filter(d => d.status === 'Absent').length;
                const total = present + absent;

                const maxGaugePct = list.reduce((max, curr) => Math.max(max, curr.percentage || 0), 0);
                const pct = total > 0 ? Math.round((present / total) * 100) : maxGaugePct;

                finalAttendance.push({
                    course: courseKey,
                    courseName: courseName || list[0].courseName || courseNames.get(courseKey) || courseKey,
                    percentage: pct,
                    present,
                    absent,
                    total,
                    stillToGo: maxStillToGo,
                    dates: uniqueDates
                });
            }
            stats.attendance = finalAttendance;
        }

        if (stats.cie && stats.cie.length > 0) {
            const finalCie = [];
            const cieMap = new Map();

            stats.cie.forEach(item => {
                const key = item.course.toUpperCase();
                if (!cieMap.has(key)) {
                    cieMap.set(key, []);
                }
                cieMap.get(key).push(item);
            });

            for (const [courseKey, list] of cieMap.entries()) {
                let bestEntry = list[0];
                for (const item of list) {
                    if (item.breakdown && hasBreakdownMarks(item.breakdown)) {
                        bestEntry = item;
                        break;
                    }
                    if (item.marks > (bestEntry.marks || 0)) {
                        bestEntry = item;
                    }
                }
                
                finalCie.push({
                    ...bestEntry,
                    course: courseKey,
                    courseName: bestEntry.courseName || courseNames.get(courseKey) || courseKey
                });
            }
            stats.cie = finalCie;
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
