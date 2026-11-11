import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { setSessionIdentity, getSessionUsn } from '@/lib/authSession';
import { erpCache } from '@/lib/erpCache';
import { sectionSentinel } from '@/lib/sentinelManager';
import { fetchWithRetry, pLimitPool } from '@/lib/fetchRetry';
import {
    ERP_BASE_URL,
    DEFAULT_USER_AGENT,
    COMMON_BROWSER_HEADERS,
    createHttpsAgent,
    resolveErpUrl,
} from '@/lib/erpConfig';

const httpsAgent = createHttpsAgent();
const BASE_URL = ERP_BASE_URL;

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

const hasDetailedCounts = (cached) => {
    return (
        cached &&
        Array.isArray(cached.attendance) &&
        cached.attendance.length > 0 &&
        cached.attendance.every(
            (a) => (Number(a.total || 0) > 0 || (a.dates && a.dates.length > 0))
        )
    );
};

export async function scrapeStudentDashboard({
    sessionCookie,
    targetUrl,
    knownUsn,
    forceRefresh = false,
    includeCieDetails = false,
    mode = 'auto',
}) {
    if (knownUsn && !forceRefresh) {
        const cachedFull = erpCache.get(`dash_full_${knownUsn}`);
        if (cachedFull && (mode !== 'details' && (hasDetailedCounts(cachedFull) || mode === 'fast'))) {
            return { data: cachedFull, fromCache: true };
        }
    }

    const flightKey = `dash_flight_${knownUsn || 'session'}`;
    return await erpCache.coalesce(flightKey, async () => {
        if (knownUsn && !forceRefresh) {
            const cachedFull = erpCache.get(`dash_full_${knownUsn}`);
            if (cachedFull && (mode !== 'details' && (hasDetailedCounts(cachedFull) || mode === 'fast'))) {
                return { data: cachedFull, fromCache: true };
            }
        }

        let res = await fetchWithRetry(() =>
            axios.get(targetUrl, {
                httpsAgent,
                timeout: 12000,
                headers: {
                    ...COMMON_BROWSER_HEADERS,
                    Cookie: sessionCookie,
                    Referer: ERP_BASE_URL,
                },
            }),
            { retries: 2, baseDelayMs: 400 }
        );

        let $ = cheerio.load(res.data);
        let resText = typeof res.data === 'string' ? res.data : (typeof res.data === 'object' && res.data !== null ? JSON.stringify(res.data) : String(res.data || ''));

        // If targetUrl (e.g. carrying an old ksign from a previous session) returned login form,
        // retry immediately with clean canonical BASE_URL
        if ($('form#login-form').length > 0 || resText.includes('Login to Your Account')) {
            if (targetUrl !== BASE_URL) {
                console.log(`[dashboard] targetUrl with ksign failed, retrying clean BASE_URL...`);
                res = await fetchWithRetry(() =>
                    axios.get(BASE_URL, {
                        httpsAgent,
                        timeout: 12000,
                        headers: {
                            ...COMMON_BROWSER_HEADERS,
                            Cookie: sessionCookie,
                            Referer: ERP_BASE_URL,
                        },
                    }),
                    { retries: 1, baseDelayMs: 400 }
                );
                $ = cheerio.load(res.data);
                resText = typeof res.data === 'string' ? res.data : (typeof res.data === 'object' && res.data !== null ? JSON.stringify(res.data) : String(res.data || ''));
            }
        }

        // Check if we are still not logged in
        if ($('form#login-form').length > 0 || resText.includes('Login to Your Account')) {
            throw new Error('Session expired or not logged in');
        }

        const stats = {
            profileName: $('h3.profile-name, .user-name, .cn-user-name').first().text().trim() || 'Student',
            pageTitle: $('title').text().trim(),
            tablesData: [],
            metrics: [],
            photoUrl: '',
        };

        // Extract student photo if present on dashboard
        const imgSelectors = ['.cn-user-avatar img', '.profile-photo img', '.user-photo img', '.uk-cover img', '.avatar img'];
        for (const sel of imgSelectors) {
            const src = $(sel).first().attr('src');
            if (src && !src.toLowerCase().includes('logo') && !src.toLowerCase().includes('svit')) {
                stats.photoUrl = resolveErpUrl(src);
                break;
            }
        }

        const attendanceLinks = [];
        const cieLinks = [];
        const courseNames = new Map();

        $('table').each((i, table) => {
            const tableData = [];
            $(table).find('tr').each((j, row) => {
                const rowData = [];
                $(row).find('th, td').each((k, cell) => {
                    rowData.push($(cell).text().trim().replace(/\s+/g, ' '));

                    const link = $(cell).find('a').attr('href');
                    if (link && link.includes('task=attendencelist')) {
                        const cells = $(row).find('td');
                        const courseCode = cleanText(cells.first().text());
                        const courseName = cleanText(cells.eq(1).text());
                        if (courseCode && courseName) courseNames.set(courseCode, courseName);
                        attendanceLinks.push({ course: courseCode, courseName, url: resolveErpUrl(link) });
                    }

                    if (link && link.includes('task=ciedetails')) {
                        const cells = $(row).find('td');
                        const courseCode = cleanText(cells.first().text());
                        const courseName = cleanText(cells.eq(1).text());
                        if (courseCode && courseName) courseNames.set(courseCode, courseName);
                        cieLinks.push({ course: courseCode, courseName, url: resolveErpUrl(link) });
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

        const attendanceScript = scripts.find((s) => s && s.includes('type: "gauge"'));
        if (attendanceScript) {
            const matches = [...attendanceScript.matchAll(/\[\s*"([^"]+)"\s*,\s*([0-9.]+)\s*\]/g)];
            matches.forEach((m) => {
                stats.attendance.push({
                    course: m[1],
                    courseName: courseNames.get(m[1]) || '',
                    percentage: parseFloat(m[2]),
                    present: 0,
                    absent: 0,
                    total: 0,
                    stillToGo: 0,
                    dates: [],
                });
            });
        }

        const cieScript = scripts.find((s) => s && s.includes('type: "bar"'));
        if (cieScript) {
            const matches = [...cieScript.matchAll(/\[\s*"([^"]+)"\s*,\s*([0-9.]+)\s*\]/g)];
            matches.forEach((m) => {
                stats.cie.push({
                    course: m[1],
                    courseName: courseNames.get(m[1]) || '',
                    marks: parseFloat(m[2]),
                    maxMarks: null,
                    breakdown: emptyBreakdown(),
                });
            });
        }

        // Student Info
        const fullPageText = $('body').text().replace(/\s+/g, ' ');
        const usnMatch = fullPageText.match(/USN\s*:\s*(1[a-z0-9]{9})/i) || fullPageText.match(/(1[a-z]{2}\d{2}[a-z]{2}\d{3})/i);
        stats.usn = usnMatch ? usnMatch[1].toUpperCase() : (knownUsn || '');

        // Extract official below 80% legend if present in HTML (e.g. <span class="uk-label cn-attend cn-color-red">4 below 80%</span>)
        let officialBelow80 = null;
        const legendRedText = $('.cn-att-legend .cn-color-red, .cn-legend .cn-color-red, span.cn-color-red').text().trim();
        const below80Match = legendRedText.match(/(\d+)\s*below\s*80%/i) || fullPageText.match(/(\d+)\s*below\s*80%/i);
        if (below80Match) {
            officialBelow80 = parseInt(below80Match[1], 10);
        }
        stats.officialBelow80 = officialBelow80;

        let department = '';
        const deptMatch = fullPageText.match(/Department\s*:\s*(.*?)(?=Semester|Category|Quota|$)/i);
        if (deptMatch) {
            department = deptMatch[1].trim();
        } else {
            const headerMatch = fullPageText.match(/([A-Za-z.\-]+)\s*,\s*SEM\s*0?\d+/i);
            if (headerMatch) department = headerMatch[1].trim();
        }
        stats.department = department;

        const semMatch = fullPageText.match(/Semester\s*:\s*(\d+)/i) || fullPageText.match(/SEM\s*0?(\d+)/i);
        stats.semester = semMatch ? semMatch[1] : '';

        const secMatch = fullPageText.match(/SEC\s*([A-Z0-9]+)/i) || fullPageText.match(/Section\s*:\s*([A-Z0-9]+)/i);
        stats.section = secMatch ? secMatch[1].trim() : '';

        const headerDetailMatch = fullPageText.match(/([A-Za-z.\-]+)\s*,\s*SEM\s*0?(\d+)\s*,?\s*SEC\s*([A-Z0-9]+)?/i);
        if (headerDetailMatch) {
            if (!stats.department) stats.department = headerDetailMatch[1].trim();
            if (!stats.semester) stats.semester = headerDetailMatch[2].trim();
            if (!stats.section && headerDetailMatch[3]) stats.section = headerDetailMatch[3].trim();
        }

        if (stats.profileName === 'Student') {
            const possibleNames = $('h1, h2, h3, h4, .uk-h3, .uk-h4').map((i, el) => $(el).text().trim()).get();
            const goodName = possibleNames.find((n) => n.length > 3 && n.length < 30 && !n.includes('Welcome') && !n.includes('Contineo'));
            if (goodName) stats.profileName = goodName;
        }

        $('.uk-card, .panel, .widget').each((i, el) => {
            stats.metrics.push($(el).text().replace(/\s+/g, ' ').trim());
        });

        // 3. Scrape Attendance Sub-Pages with Controlled Concurrency Pool
        // Fetch all sub-pages so exact present, absent, total counts and dates are complete for every subject!
        // Uses concurrency of 2 with HTTP keep-alive so Accredia's session file locks never collide or drop.
        if (mode !== 'fast' && attendanceLinks.length > 0) {
            try {
                const detailedResultsSettled = await pLimitPool(attendanceLinks, 2, (linkObj) =>
                    fetchWithRetry(
                        () =>
                            axios.get(linkObj.url, {
                                httpsAgent,
                                timeout: 9000,
                                headers: {
                                    ...COMMON_BROWSER_HEADERS,
                                    Cookie: sessionCookie,
                                    Referer: ERP_BASE_URL,
                                },
                            }),
                        { retries: 2, baseDelayMs: 250 }
                    ).then((detailRes) => {
                        const _$ = cheerio.load(detailRes.data);
                        const pageText = _$('body').text().replace(/\s+/g, ' ');
                        const presentMatch = _$('.cn-legend .cn-color-green').text().match(/\[(\d+)\]/);
                        const absentMatch = _$('.cn-legend .cn-color-red').text().match(/\[(\d+)\]/);
                        const stillLegendMatch = _$('.cn-legend .cn-still, .cn-legend .cn-color-grey, .cn-legend span:contains("Still"), .cn-legend span:contains("STILL")').text().match(/\[(\d+)\]/);
                        const stillProgressMatch = _$('.sc-progress-bar[title*="Still to go"]').first().attr('title')?.match(/Still to go\s*:\s*(\d+)/i);
                        const stillToGoMatch = stillLegendMatch || pageText.match(/STILL\s+TO\s+GO\s*\[\s*(\d+)\s*\]/i) || stillProgressMatch;

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
                                    time: _$(cols[2]).text().trim().replace(/\s+/g, ' '),
                                    status: 'Present',
                                });
                            }
                        });

                        _$('.cn-attend-list2 tbody tr').each((i, row) => {
                            const cols = _$(row).find('td');
                            if (cols.length >= 4) {
                                dates.push({
                                    date: _$(cols[1]).text().trim(),
                                    time: _$(cols[2]).text().trim().replace(/\s+/g, ' '),
                                    status: 'Absent',
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

                detailedResultsSettled.forEach((settled) => {
                    const detail = settled.status === 'fulfilled' ? settled.value : null;
                    if (detail) {
                        const match = stats.attendance.find((a) =>
                            a.course.toUpperCase() === detail.course.toUpperCase() ||
                            a.course.toUpperCase().startsWith(detail.course.toUpperCase()) ||
                            detail.course.toUpperCase().startsWith(a.course.toUpperCase())
                        );
                        if (match) {
                            match.present = detail.present;
                            match.absent = detail.absent;
                            match.total = detail.total;
                            match.stillToGo = detail.stillToGo;
                            match.courseName = detail.courseName || match.courseName;
                            match.dates = detail.dates;
                        } else {
                            stats.attendance.push(detail);
                        }
                    }
                });
            } catch (e) {
                console.error('Failed to fetch detailed attendance:', e.message);
            }
        }

        // Deduplicate & calculate exact attendance metrics
        if (stats.attendance && stats.attendance.length > 0) {
            const finalAttendance = [];
            const attMap = new Map();

            stats.attendance.forEach((item) => {
                const key = item.course.toUpperCase();
                if (!attMap.has(key)) attMap.set(key, []);
                attMap.get(key).push(item);
            });

            for (const [courseKey, list] of attMap.entries()) {
                const allDates = [];
                let maxStillToGo = 0;
                let courseName = '';

                list.forEach((item) => {
                    if (item.dates) allDates.push(...item.dates);
                    if (item.stillToGo > maxStillToGo) maxStillToGo = item.stillToGo;
                    if (item.courseName && !courseName) courseName = item.courseName;
                });

                const seenDates = new Set();
                const uniqueDates = [];
                allDates.forEach((d) => {
                    const key = `${d.date}_${d.time}`;
                    if (!seenDates.has(key)) {
                        seenDates.add(key);
                        uniqueDates.push(d);
                    }
                });

                uniqueDates.sort((a, b) => {
                    const parseD = (d) => {
                        const p = d.split('-');
                        return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime() : 0;
                    };
                    return parseD(a.date) - parseD(b.date);
                });

                const parsedPresent = list.reduce((max, curr) => Math.max(max, curr.present || 0), 0);
                const parsedAbsent = list.reduce((max, curr) => Math.max(max, curr.absent || 0), 0);
                const parsedTotal = list.reduce((max, curr) => Math.max(max, curr.total || 0), 0);
                const datePresent = uniqueDates.filter((d) => d.status === 'Present').length;
                const dateAbsent = uniqueDates.filter((d) => d.status === 'Absent').length;
                const present = uniqueDates.length > 0 ? datePresent : parsedPresent;
                const absent = uniqueDates.length > 0 ? dateAbsent : parsedAbsent;
                const total = Math.max(present + absent, parsedTotal);

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
                    dates: uniqueDates,
                });
            }
            stats.attendance = finalAttendance;
        }

        // Scrape detailed CIE breakdown so marks are complete
        if (cieLinks.length > 0) {
            try {
                const cieDetailsSettled = await pLimitPool(cieLinks, 4, (linkObj) =>
                    fetchWithRetry(
                        () =>
                            axios.get(linkObj.url, {
                                httpsAgent,
                                timeout: 7000,
                                headers: {
                                    ...COMMON_BROWSER_HEADERS,
                                    Cookie: sessionCookie,
                                    Referer: ERP_BASE_URL,
                                },
                            }),
                        { retries: 2, baseDelayMs: 300 }
                    ).then((detailRes) => parseCieDetailPage(detailRes.data, linkObj)).catch(() => null)
                );

                const cieDetails = cieDetailsSettled
                    .filter((s) => s.status === 'fulfilled' && s.value)
                    .map((s) => s.value);

                cieDetails.filter(Boolean).forEach((detail) => {
                    const existing = stats.cie.find((item) =>
                        item.course.toUpperCase() === detail.course.toUpperCase() ||
                        item.course.toUpperCase().startsWith(detail.course.toUpperCase()) ||
                        detail.course.toUpperCase().startsWith(item.course.toUpperCase())
                    );
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

        if (stats.cie && stats.cie.length > 0) {
            const finalCie = [];
            const cieMap = new Map();

            stats.cie.forEach((item) => {
                const key = item.course.toUpperCase();
                if (!cieMap.has(key)) cieMap.set(key, []);
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
                    courseName: bestEntry.courseName || courseNames.get(courseKey) || courseKey,
                });
            }
            stats.cie = finalCie;
        }

        // Cache the parsed details and full stats in memory
        if (stats.usn) {
            erpCache.set(`dash_details_${stats.usn}`, { attendance: stats.attendance, cie: stats.cie }, 900);
            erpCache.set(`dash_full_${stats.usn}`, stats, 900);

            // Compute total conducted classes across courses to feed the section sentinel
            if (Array.isArray(stats.attendance)) {
                const totalConducted = stats.attendance.reduce((acc, curr) => {
                    const t = Number(curr.total) || (Number(curr.present || 0) + Number(curr.absent || 0));
                    return acc + t;
                }, 0);
                
                const section = stats.section || '';
                const sem = stats.sem || stats.semester || '';
                const branch = stats.branch || (stats.usn.length >= 7 ? stats.usn.substring(5, 7) : '');
                sectionSentinel.reportAttendanceState(section, sem, branch, totalConducted);
            }
        }

        return { data: stats, fromCache: false };
    });
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || (searchParams.get('quick') ? 'fast' : (searchParams.get('details') ? 'details' : 'fast'));

        const cookieStore = await cookies();
        const cookieStrings = [];

        cookieStore.getAll().forEach((cookie) => {
            if (cookie.name !== 'dashboard_url') {
                cookieStrings.push(`${cookie.name}=${cookie.value}`);
            }
        });

        const sessionCookie = cookieStrings.join('; ');
        const dashboardUrlCookie = cookieStore.get('dashboard_url');
        const targetUrl = resolveErpUrl(dashboardUrlCookie ? dashboardUrlCookie.value : BASE_URL);

        if (!sessionCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const knownUsn = getSessionUsn(cookieStore);

        const result = await scrapeStudentDashboard({
            sessionCookie,
            targetUrl,
            knownUsn,
            forceRefresh: mode === 'refresh',
            includeCieDetails: mode === 'details',
            mode,
        });

        const hasDetails = mode === 'details' || (Array.isArray(result.data?.attendance) && result.data.attendance.some(a => a.dates && a.dates.length > 0));

        const response = NextResponse.json({
            success: true,
            data: result.data,
            fromCache: result.fromCache,
            hasDetails,
            isPartial: !hasDetails,
        });
        setSessionIdentity(response, { usn: result.data?.usn || knownUsn, name: result.data?.profileName });
        return response;
    } catch (error) {
        console.error('Dashboard Scraper Error:', error.message);
        if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
            return NextResponse.json({ error: 'Session expired or not logged in' }, { status: 401 });
        }

        // Graceful fallback to cached student dashboard if upstream Accredia is busy/timing out
        try {
            const knownUsn = getSessionUsn(cookieStore);
            if (knownUsn) {
                const cached = erpCache.get(`dash_full_${knownUsn}`) || erpCache.get(`dash_fast_${knownUsn}`);
                if (cached && (!cached.usn || cached.usn.toUpperCase() === knownUsn.toUpperCase())) {
                    console.log(`[dashboard] Upstream error, serving cached dashboard for ${knownUsn}`);
                    const hasDetails = Array.isArray(cached.attendance) && cached.attendance.some((a) => a.dates && a.dates.length > 0);
                    const response = NextResponse.json({
                        success: true,
                        data: cached,
                        fromCache: true,
                        fallback: true,
                        hasDetails,
                        isPartial: !hasDetails,
                    });
                    setSessionIdentity(response, { usn: cached.usn || knownUsn, name: cached.profileName });
                    return response;
                }
            }
        } catch (_) {}

        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
