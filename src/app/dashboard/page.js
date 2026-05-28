"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMergedAttendance, saveSelfLoggedAttendance } from "@/lib/clientApi";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissExam, setDismissExam] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener("attendanceChanged", handleUpdate);
    return () => window.removeEventListener("attendanceChanged", handleUpdate);
  }, []);

  useEffect(() => {
    // Show cached data instantly if available
    queueMicrotask(() => {
      try {
        const cachedData = sessionStorage.getItem('dashboard_data');
        const cachedTimetable = sessionStorage.getItem('dashboard_timetable');
        if (cachedData) setData(JSON.parse(cachedData));
        if (cachedTimetable) setTimetable(JSON.parse(cachedTimetable));
        if (cachedData && cachedTimetable) setLoading(false);
      } catch { }
    });

    const fetchAll = async () => {
      try {
        const [dashRes, ttRes] = await Promise.all([
          fetch("/api/student/dashboard"),
          fetch("/api/student/timetable")
        ]);

        if (dashRes.status === 401 || ttRes.status === 401) {
          router.push("/");
          return;
        }

        const [dashJson, ttJson] = await Promise.all([dashRes.json(), ttRes.json()]);

        if (dashJson.success) {
          setData(dashJson.data);
          try { sessionStorage.setItem('dashboard_data', JSON.stringify(dashJson.data)); } catch { }
        }
        if (ttJson.success) {
          setTimetable(ttJson.data);
          try { sessionStorage.setItem('dashboard_timetable', JSON.stringify(ttJson.data)); } catch { }
        }

        if (!dashJson.success) setError(dashJson.error || "Failed to load dashboard.");
      } catch (err) {
        setError("Could not connect to server.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [router]);

  const attendance = useMemo(() => {
    if (!data) return [];
    return getMergedAttendance(data.attendance, data.usn);
  }, [data, refreshKey]);
  const cie = useMemo(() => data?.cie || [], [data]);

  const summary = useMemo(() => {
    const avgAtt = attendance.length > 0
      ? Math.round(attendance.reduce((sum, item) => sum + toNumber(item.percentage), 0) / attendance.length)
      : 0;
    const lowAtt = attendance.filter(item => toNumber(item.percentage) < 80).length;
    
    const validCie = cie.filter(item => toNumber(item.marks) > 0);
    const avgCie = validCie.length > 0
      ? Math.round((validCie.reduce((sum, item) => sum + toNumber(item.marks), 0) / validCie.length) * 10) / 10
      : 0;
    return { avgAtt, lowAtt, avgCie };
  }, [attendance, cie]);

  // Today's schedule logic
  const todaySchedule = useMemo(() => {
    if (!timetable) return null;
    const now = new Date();
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayName = dayNames[now.getDay()];

    const dayData = timetable.find(d => d.day.toUpperCase() === todayName);
    if (!dayData) return [];

    return dayData.classes.map(cls => {
      // Find matching attendance
      const courseMatch = attendance.find(a =>
        cls.course.toUpperCase().includes(a.course.toUpperCase()) ||
        (a.courseName && cls.course.toUpperCase().includes(a.courseName.toUpperCase()))
      );

      // Determine Now/Next
      let status = "";
      let diffEnd = 1000;
      let diffStart = 1000;
      try {
        const [startStr, endStr] = cls.time.split(" to ");
        if (startStr && endStr) {
          const parseTime = (timeStr) => {
            const [h, m] = timeStr.match(/\d+/g);
            const isPm = timeStr.toLowerCase().includes("pm") && parseInt(h) !== 12;
            const t = new Date();
            t.setHours(isPm ? parseInt(h) + 12 : (parseInt(h) === 12 && timeStr.toLowerCase().includes("am") ? 0 : parseInt(h)), parseInt(m), 0);
            return t;
          };
          const startTime = parseTime(startStr);
          const endTime = parseTime(endStr);

          diffStart = (startTime - now) / (1000 * 60); // minutes until start
          diffEnd = (endTime - now) / (1000 * 60); // minutes until end

          if (diffStart <= 0 && diffEnd > 0) status = "NOW";
          else if (diffStart > 0 && diffStart <= 60) status = "NEXT";
        }
      } catch (e) { }

      return { ...cls, attendance: courseMatch, status, diffEnd, diffStart };
    });
  }, [timetable, attendance]);

  const todayDateStr = useMemo(() => {
    if (!timetable) return "";
    const now = new Date();
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayName = dayNames[now.getDay()];
    const dayData = timetable.find(d => d.day.toUpperCase() === todayName);
    if (dayData?.date) {
      return dayData.date.replace(/\//g, '-');
    }
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }, [timetable]);

  const handleSaveAttendance = (courseCode, status, time) => {
    if (!data?.usn) return;
    saveSelfLoggedAttendance(data.usn, courseCode, todayDateStr, status, time);
  };

  if (loading) return <div className="center-state"><div className="loader" /></div>;
  if (error) return <div className="center-state"><div className="auth-card" style={{ textAlign: "center" }}><h1 className="title">Oops</h1><p>{error}</p><button onClick={() => router.push("/")} className="button">Retry</button></div></div>;

  const BRANCH_MAP = {
    "CS": "COMPUTER SCIENCE AND ENGINEERING",
    "CD": "DATA SCIENCE",
    "EC": "ELECTRONICS AND COMMUNICATION ENGINEERING",
    "ME": "MECHANICAL ENGINEERING",
    "CV": "CIVIL ENGINEERING",
    "IS": "INFORMATION SCIENCE AND ENGINEERING",
    "AI": "ARTIFICIAL INTELLIGENCE",
    "CI": "AI & MACHINE LEARNING",
    "CSE": "COMPUTER SCIENCE AND ENGINEERING",
    "CSE(DS)": "DATA SCIENCE",
    "CSE(AI&ML)": "AI & MACHINE LEARNING",
  };

  let branchCode = (data?.department || data?.profileData?.department || "").toUpperCase();
  if (branchCode.startsWith("B.E-")) branchCode = branchCode.replace("B.E-", "");
  if (branchCode.startsWith("B.E ")) branchCode = branchCode.replace("B.E ", "");
  
  const fullBranch = BRANCH_MAP[branchCode] || branchCode;
  const sem = data?.semester ? `Sem ${data.semester}` : "";
  const profileLine = [fullBranch ? `B.E - ${fullBranch}` : "", sem].filter(Boolean).join(" · ");

  return (
    <main className="mobile-app-shell native-home fade-in" style={{ paddingBottom: "100px" }}>
      <section className="home-profile-card" style={{ marginTop: 12 }}>
        <div className="home-avatar">{data?.profileName?.charAt(0) || "S"}</div>
        <div>
          <h2>{data?.profileName || "Student"}</h2>
          <p>{data?.usn || "Signed In"}</p>
          <p style={{ marginTop: 4, fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{profileLine || "Student Portal"}</p>
          <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}</span>
        </div>
      </section>

      {/* Quick Stats Strip */}
      <div className="home-stats-strip">
        <div className="home-stat-pill">
          <span>Overall</span>
          <strong>{summary.avgAtt}%</strong>
        </div>
        <div className="home-stat-pill">
          <span>At Risk</span>
          <strong style={{ color: summary.lowAtt ? "var(--danger)" : "var(--success)" }}>{summary.lowAtt}</strong>
        </div>
        <div className="home-stat-pill">
          <span>Avg CIE</span>
          <strong>{summary.avgCie}</strong>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="home-section-title">
        <h2>Today&apos;s Schedule</h2>
        <Link href="/dashboard/timetable">Full week</Link>
      </div>

      {todaySchedule && todaySchedule.length > 0 ? (
        <section className="home-schedule-list">
          {todaySchedule.map((cls, i) => {
            const courseCode = (cls.attendance?.course || cls.course).toUpperCase();
            const officialEntry = cls.attendance?.dates?.find(
              d => !d.isSelfLogged && (d.date === todayDateStr || d.date.replace(/\//g, '-') === todayDateStr)
            );
            const selfEntry = cls.attendance?.dates?.find(
              d => d.isSelfLogged && (d.date === todayDateStr || d.date.replace(/\//g, '-') === todayDateStr)
            );

            return (
              <article 
                className="home-schedule-card" 
                key={i} 
                style={{ display: "grid", gridTemplateColumns: "80px minmax(0, 1fr) auto", rowGap: "12px", alignItems: "center" }}
              >
                <div className="home-schedule-time">
                  {cls.time.split(" to ")[0]}
                  {cls.status === "NOW" && <span className="home-now-badge">NOW</span>}
                  {cls.status === "NEXT" && <span className="home-next-badge">NEXT</span>}
                </div>
                <div className="home-schedule-info">
                  <h3>{cls.course}</h3>
                  <p>{cls.room} · {cls.faculty}</p>
                </div>
                <div className="home-schedule-meta">
                  {cls.attendance && (
                    <span className={`home-schedule-pct ${toNumber(cls.attendance.percentage) < 80 ? 'risk' : ''}`}>
                      {cls.attendance.percentage}%
                    </span>
                  )}
                </div>

                {/* Attendance Interactive Logging Widget */}
                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--line)", paddingTop: "12px", marginTop: "4px" }}>
                  {officialEntry ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: officialEntry.status === "Present" ? "var(--success)" : "var(--danger)" }} />
                      <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 700 }}>
                        Official Attendance: <strong style={{ color: officialEntry.status === "Present" ? "var(--success)" : "var(--danger)" }}>{officialEntry.status === "Present" ? "Attended" : "Bunked"}</strong>
                      </span>
                    </div>
                  ) : selfEntry ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: selfEntry.status === "Present" ? "var(--success)" : "var(--danger)" }} />
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 700 }}>
                          You marked this as <strong style={{ color: selfEntry.status === "Present" ? "var(--success)" : "var(--danger)" }}>{selfEntry.status === "Present" ? "Attended" : "Bunked"}</strong>
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleSaveAttendance(courseCode, null)}
                        style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "var(--muted)", padding: "4px 10px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", transition: "all 150ms ease" }}
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        Did you attend this class?
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          type="button"
                          onClick={() => handleSaveAttendance(courseCode, "Present", cls.time)}
                          style={{ flex: 1, padding: "8px 14px", background: "rgba(52, 209, 120, 0.12)", border: "1px solid rgba(52, 209, 120, 0.2)", borderRadius: "10px", color: "var(--success)", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer", transition: "all 150ms ease" }}
                        >
                          Yes, Attended
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleSaveAttendance(courseCode, "Absent", cls.time)}
                          style={{ flex: 1, padding: "8px 14px", background: "rgba(255, 91, 104, 0.12)", border: "1px solid rgba(255, 91, 104, 0.2)", borderRadius: "10px", color: "var(--danger)", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer", transition: "all 150ms ease" }}
                        >
                          No, Bunked
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="home-empty-day">
          <p>No classes scheduled for today.</p>
          <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>Enjoy your break!</p>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="home-section-title" style={{ marginTop: 24 }}>
        <h2>Quick Actions</h2>
      </div>
      <nav className="home-quick-actions">
        <Link href="/dashboard/attendance" className="home-action-tile">
          <span className="home-action-icon">📊</span>
          <span className="home-action-label">Attendance</span>
        </Link>
        <Link href="/dashboard/timetable" className="home-action-tile">
          <span className="home-action-icon">📅</span>
          <span className="home-action-label">Timetable</span>
        </Link>
        <Link href="/dashboard/bunk" className="home-action-tile">
          <span className="home-action-icon">🧮</span>
          <span className="home-action-label">Bunk Calc</span>
        </Link>
        <Link href="/dashboard/results" className="home-action-tile">
          <span className="home-action-icon">📝</span>
          <span className="home-action-label">CIE Marks</span>
        </Link>
        <Link href="/dashboard/marketplace" className="home-action-tile">
          <span className="home-action-icon">🛒</span>
          <span className="home-action-label">Market</span>
        </Link>
        <Link href="/dashboard/connect" className="home-action-tile">
          <span className="home-action-icon">💬</span>
          <span className="home-action-label">Connect</span>
        </Link>
        <Link href="/dashboard/idcard" className="home-action-tile">
          <span className="home-action-icon">🪪</span>
          <span className="home-action-label">ID Card</span>
        </Link>
        <Link href="/dashboard/exams" className="home-action-tile">
          <span className="home-action-icon">📋</span>
          <span className="home-action-label">Exams</span>
        </Link>
        <Link href="/dashboard/canteen" className="home-action-tile">
          <span className="home-action-icon">🍔</span>
          <span className="home-action-label">Canteen</span>
        </Link>
        <Link href="/dashboard/map" className="home-action-tile">
          <span className="home-action-icon">🗺️</span>
          <span className="home-action-label">Campus Map</span>
        </Link>
      </nav>

      <section className="grid" style={{ marginTop: 32 }}>
        {/* Attendance Snapshot */}
        <section className="panel">
          <div className="panel-head compact">
            <h2 className="panel-title">Courses</h2>
            <Link href="/dashboard/attendance" style={{ fontSize: "0.8rem", color: "var(--primary)" }}>View All</Link>
          </div>
          <div className="list">
            {attendance.slice(0, 5).map((item, idx) => (
              <div className="home-course-mini" key={idx}>
                <div className="home-course-mini-info">
                  <strong>{item.courseName || item.course}</strong>
                  <div className="home-course-mini-bar">
                    <div
                      className={`home-course-mini-fill ${toNumber(item.percentage) < 80 ? 'low' : ''}`}
                      style={{ width: `${clamp(toNumber(item.percentage), 0, 100)}%` }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: "0.9rem", fontWeight: 900, color: toNumber(item.percentage) < 80 ? "var(--danger)" : "var(--success)" }}>
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CIE Snapshot */}
        <section className="panel">
          <div className="panel-head compact">
            <h2 className="panel-title">Internal Marks</h2>
          </div>
          <div className="list">
            {cie.length > 0 ? (
              cie.slice(0, 6).map((item, idx) => (
                <div className="home-cie-row" key={idx}>
                  <span>{item.course}</span>
                  <strong>{item.marks}</strong>
                </div>
              ))
            ) : (
              <p className="subtle">No CIE data available.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
