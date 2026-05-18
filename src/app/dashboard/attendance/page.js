"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getMergedAttendance, saveSelfLoggedAttendance } from "@/lib/clientApi";

const SEMESTER_END_DATE = new Date("2026-06-15T23:59:59");

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getCourseName(item) {
  return item.courseName || item.course || "Course";
}

function getCanSkip(item, target, remainingCalculated) {
  const present = toNumber(item.present);
  const absent = toNumber(item.absent);
  const total = Math.max(toNumber(item.total), present + absent);
  const remaining = Math.max(0, remainingCalculated);
  if (!total || !remaining) return 0;
  const finalTotal = total + remaining;
  const needed = Math.max(Math.ceil((target / 100) * finalTotal) - present, 0);
  return Math.max(remaining - needed, 0);
}

function AttendanceCard({ item, classesRemaining, target, index, usn }) {
  const [isLogOpen, setIsLogOpen] = useState(false);

  let remainingCalculated = 0;
  Object.entries(classesRemaining).forEach(([cName, count]) => {
    if (cName.includes(item.course.toUpperCase()) || (item.courseName && cName.includes(item.courseName.toUpperCase())) || (item.courseName && item.courseName.toUpperCase().includes(cName))) {
      remainingCalculated = Math.max(remainingCalculated, count);
    }
  });
  
  const percentage = toNumber(item.percentage);
  const present = toNumber(item.present);
  const total = Math.max(toNumber(item.total), present + toNumber(item.absent));
  const canSkip = getCanSkip(item, target, remainingCalculated);

  return (
    <article className="native-attendance-card" key={`${item.course}-${index}`}>
      <div className={`attendance-percent${percentage < target ? " risk" : ""}`}>{percentage}%</div>
      <div className="attendance-course-body">
        <h2>{getCourseName(item)}</h2>
        <p>{item.course}</p>
        <div className="attendance-progress-row">
          <div className="attendance-progress"><span style={{ width: `${clamp(percentage, 0, 100)}%` }} /></div>
          <strong>{present || "-"} / {total || "-"}</strong>
        </div>
        <p className={percentage < target ? "risk-text" : "safe-text"}>
          {percentage < target
            ? `Attend upcoming classes to reach ${target}%. (${remainingCalculated} left)`
            : `Can skip ${canSkip} of ${remainingCalculated} remaining classes`}
        </p>
      </div>

      {item.dates && item.dates.length > 0 && (
        <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
          <button 
            type="button" 
            onClick={() => setIsLogOpen(!isLogOpen)}
            style={{ width: "100%", textAlign: "center", padding: "12px 0", background: "transparent", color: "var(--primary)", fontWeight: 800, fontSize: "0.85rem", borderTop: "1px dashed var(--line)", cursor: "pointer", transition: "color 150ms ease" }}
          >
            {isLogOpen ? "Hide Attendance Log" : "View Attendance Log"}
          </button>
          
          {isLogOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto", padding: "4px 2px", marginTop: "8px", scrollbarWidth: "thin" }}>
              {item.dates.map((dateObj, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--surface-soft)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "#fff", display: "block", marginBottom: "4px" }}>{dateObj.date}</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {dateObj.time}
                      {dateObj.isSelfLogged && (
                        <span style={{ color: "var(--warning)", fontWeight: 800, marginLeft: "8px" }}>
                          • Self Logged
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 900, color: dateObj.status === "Present" ? "var(--success)" : "var(--danger)", padding: "6px 10px", background: dateObj.status === "Present" ? "rgba(33, 131, 92, 0.12)" : "rgba(255, 59, 48, 0.12)", borderRadius: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {dateObj.status}
                    </span>
                    {dateObj.isSelfLogged && (
                      <button
                        type="button"
                        onClick={() => saveSelfLoggedAttendance(usn, item.course, dateObj.date, null)}
                        style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "1.1rem", fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "4px", transition: "transform 150ms ease" }}
                        title="Delete Self Log"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function AttendancePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [target, setTarget] = useState(75);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener("attendanceChanged", handleUpdate);
    return () => window.removeEventListener("attendanceChanged", handleUpdate);
  }, []);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      const cached = (() => {
        try { return JSON.parse(sessionStorage.getItem("dashboard_data") || "null"); } catch { return null; }
      })();
      const cachedTt = (() => {
        try { return JSON.parse(sessionStorage.getItem("dashboard_timetable") || "null"); } catch { return null; }
      })();
      if (cached) {
        setData(cached);
        if (cachedTt) setTimetable(cachedTt);
        setLoading(false);
      }
    });

    Promise.all([
      apiFetch("/api/student/dashboard"),
      apiFetch("/api/student/timetable").catch(() => ({ data: [] }))
    ])
      .then(([dashJson, ttJson]) => {
        if (!alive) return;
        setData(dashJson.data);
        if (ttJson.data) setTimetable(ttJson.data);
        try { sessionStorage.setItem("dashboard_data", JSON.stringify(dashJson.data)); } catch { }
        try { if (ttJson.data) sessionStorage.setItem("dashboard_timetable", JSON.stringify(ttJson.data)); } catch { }
      })
      .catch((err) => alive && setError(err.message || "Could not load attendance."))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [router]);

  const classesRemaining = useMemo(() => {
    const counts = {};
    if (!timetable) return counts;
    const now = new Date();
    if (now > SEMESTER_END_DATE) return counts;
    
    // Count occurrences of each day of the week between now and SEMESTER_END_DATE
    const dayCounts = { SUNDAY: 0, MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0, SATURDAY: 0 };
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    let current = new Date(now);
    current.setHours(0,0,0,0);
    const end = new Date(SEMESTER_END_DATE);
    end.setHours(23,59,59,999);
    
    while (current <= end) {
      dayCounts[dayNames[current.getDay()]]++;
      current.setDate(current.getDate() + 1);
    }
    
    // Calculate total remaining classes per subject
    timetable.forEach(day => {
      const dayName = day.day.toUpperCase();
      const occurrences = dayCounts[dayName] || 0;
      if (occurrences > 0 && day.classes) {
        day.classes.forEach(cls => {
          const cName = cls.course.toUpperCase();
          counts[cName] = (counts[cName] || 0) + occurrences;
        });
      }
    });
    
    return counts;
  }, [timetable]);

  const attendance = useMemo(() => {
    if (!data) return [];
    return getMergedAttendance(data.attendance, data.usn);
  }, [data, refreshKey]);
  const overall = useMemo(() => {
    if (!attendance.length) return 0;
    return Math.round(attendance.reduce((sum, item) => sum + toNumber(item.percentage), 0) / attendance.length);
  }, [attendance]);

  if (loading) return <div className="center-state"><div className="loader" /></div>;
  if (error) return <div className="center-state"><div className="notice error">{error}</div></div>;

  return (
    <main className="page-shell fade-in native-screen">
      <section className="native-page-head">
        <div>
          <h1>Attendance</h1>
          <p>Overall: {overall || "-"}%</p>
        </div>
      </section>

      <section className="native-control-card">
        <div className="attendance-target-row">
          <span>Target</span>
          <input
            type="range"
            min="50"
            max="95"
            value={target}
            onChange={(event) => setTarget(Number(event.target.value))}
            aria-label="Target attendance"
          />
          <strong>{target}%</strong>
        </div>
        <div className="attendance-date-row">
          <span>Semester ends</span>
          <time>June 15, 2026</time>
        </div>
      </section>

      <section className="native-list" style={{ paddingBottom: "100px" }}>
        {attendance.length ? attendance.map((item, index) => (
          <AttendanceCard 
            key={`${item.course}-${index}`}
            item={item}
            classesRemaining={classesRemaining}
            target={target}
            index={index}
            usn={data?.usn}
          />
        )) : <p className="subtle">No attendance data found.</p>}
      </section>
    </main>
  );
}
