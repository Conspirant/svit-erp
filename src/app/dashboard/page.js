"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

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

  const attendance = useMemo(() => data?.attendance || [], [data]);
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

    const upcoming = mapped.filter(cls => cls.diffEnd > 0).sort((a, b) => a.diffStart - b.diffStart);
    return upcoming.slice(0, 3);
  }, [timetable, attendance]);

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
          {todaySchedule.map((cls, i) => (
            <article className="home-schedule-card" key={i}>
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
            </article>
          ))}
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
