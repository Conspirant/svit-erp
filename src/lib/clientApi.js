"use client";

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path, options = {}) {
  const {
    retries = 1,
    retryDelay = 450,
    redirectOnUnauthorized = true,
    ...fetchOptions
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(path, {
        credentials: "same-origin",
        ...fetchOptions,
        headers: {
          ...(fetchOptions.body && !(fetchOptions.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
          ...(fetchOptions.headers || {}),
        },
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : await response.text();

      if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
        clearClientSession();
        window.location.assign("/");
      }

      if (!response.ok) {
        throw new ApiError(payload?.error || response.statusText || "Request failed.", {
          status: response.status,
          data: payload,
        });
      }

      return payload;
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && error.name !== "AbortError" && (!error.status || error.status >= 500);
      if (!canRetry) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError("Request failed.");
}

export async function apiJson(path, data, options = {}) {
  return apiFetch(path, {
    ...options,
    method: options.method || "POST",
    body: JSON.stringify(data),
  });
}

export function clearClientSession() {
  try {
    sessionStorage.removeItem("dashboard_data");
    sessionStorage.removeItem("events_data");
    sessionStorage.removeItem("profile_data");
    sessionStorage.removeItem("marketplace_dev_profile");
  } catch { }
}

export function getMergedAttendance(attendanceList, usn) {
  if (!attendanceList || !usn) return attendanceList || [];
  
  try {
    const raw = localStorage.getItem("self_logged_attendance");
    if (!raw) return attendanceList;
    const allSelfLogged = JSON.parse(raw);
    const studentLogs = allSelfLogged[usn];
    if (!studentLogs) return attendanceList;
    
    return attendanceList.map(item => {
      const courseCode = item.course.toUpperCase();
      const courseLogs = studentLogs[courseCode];
      if (!courseLogs) return item;
      
      const newDates = [...(item.dates || [])];
      let addedPresent = 0;
      let addedAbsent = 0;
      
      Object.entries(courseLogs).forEach(([dateStr, log]) => {
        const normDate = dateStr.replace(/\//g, '-');
        const existsOfficially = newDates.some(
          d => d.date === dateStr || d.date.replace(/\//g, '-') === normDate
        );
        
        if (!existsOfficially) {
          newDates.push({
            date: dateStr,
            time: log.time || "",
            status: log.status,
            isSelfLogged: true
          });
          
          if (log.status === "Present") {
            addedPresent++;
          } else if (log.status === "Absent") {
            addedAbsent++;
          }
        }
      });
      
      if (addedPresent > 0 || addedAbsent > 0) {
        const present = Number(item.present || 0) + addedPresent;
        const absent = Number(item.absent || 0) + addedAbsent;
        const total = Math.max(Number(item.total || 0), Number(item.present || 0) + Number(item.absent || 0)) + addedPresent + addedAbsent;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        
        newDates.sort((a, b) => {
          const parseD = (d) => {
            const p = d.split('-');
            return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime() : 0;
          };
          return parseD(a.date) - parseD(b.date);
        });
        
        return {
          ...item,
          present,
          absent,
          total,
          percentage,
          dates: newDates
        };
      }
      
      return item;
    });
  } catch (e) {
    console.error("Error merging attendance:", e);
    return attendanceList;
  }
}

export function saveSelfLoggedAttendance(usn, courseCode, dateStr, status, time) {
  if (!usn || !courseCode || !dateStr) return;
  try {
    const raw = localStorage.getItem("self_logged_attendance");
    const allSelfLogged = raw ? JSON.parse(raw) : {};
    if (!allSelfLogged[usn]) {
      allSelfLogged[usn] = {};
    }
    const cleanCourse = courseCode.toUpperCase();
    if (!allSelfLogged[usn][cleanCourse]) {
      allSelfLogged[usn][cleanCourse] = {};
    }
    
    if (status === null) {
      delete allSelfLogged[usn][cleanCourse][dateStr];
      if (Object.keys(allSelfLogged[usn][cleanCourse]).length === 0) {
        delete allSelfLogged[usn][cleanCourse];
      }
    } else {
      allSelfLogged[usn][cleanCourse][dateStr] = { status, time: time || "" };
    }
    
    localStorage.setItem("self_logged_attendance", JSON.stringify(allSelfLogged));
    window.dispatchEvent(new Event("attendanceChanged"));
  } catch (e) {
    console.error("Error saving self logged attendance:", e);
  }
}

export function filterElectives(list, keyGetter = (item) => item.course) {
  if (!list) return [];
  if (typeof window === "undefined") return list;
  try {
    const raw = localStorage.getItem("selected_electives");
    if (!raw) return list;
    const electives = JSON.parse(raw);
    
    return list.filter(item => {
      const itemKey = keyGetter(item);
      if (!itemKey) return true;
      const code = itemKey.toUpperCase();
      const name = (item.courseName || item.course || "").toUpperCase();

      // Kannada filter
      const isSamskrutika = code.startsWith("1BKSK") || name.includes("SAMSKRUTIKA");
      const isBalake = code.startsWith("1BKBK") || name.includes("BALAKE");
      
      if (isSamskrutika && electives.kannada && electives.kannada !== 'samskrutika') return false;
      if (isBalake && electives.kannada && electives.kannada !== 'balake') return false;

      // ESC filter (Electricals vs Building Science / Mechanics)
      const isElectrical = (code.startsWith("1BESCK") && code.endsWith("B")) || name.includes("ELECTRICAL");
      const isBuilding = (code.startsWith("1BESCK") && code.endsWith("D")) || name.includes("BUILDING") || name.includes("MECHANIC");

      if (isElectrical && electives.esc && electives.esc !== 'electricals') return false;
      if (isBuilding && electives.esc && electives.esc !== 'building') return false;

      return true;
    });
  } catch (e) {
    console.error("Error filtering electives:", e);
    return list;
  }
}

