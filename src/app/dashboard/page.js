"use client";
 
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ChevronRight,
  Copy,
  Check,
  Calendar as CalendarIcon,
  BarChart3,
  Clock,
  Calculator,
  FileText,
  ShoppingBag,
  MessageSquare,
  IdCard as IdCardIcon,
  Unlock,
  PenTool,
  GraduationCap,
} from "lucide-react";
import StudentAvatar from "@/components/StudentAvatar";
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [photo, setPhoto] = useState("");
  const [studentId, setStudentId] = useState("");
  const [profileExtra, setProfileExtra] = useState(null);
  const [copiedUsn, setCopiedUsn] = useState(false);
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
        const savedPhoto = localStorage.getItem('svit_idcard_photo');
        const isInvalid = savedPhoto && (savedPhoto.toLowerCase().includes("logo") || savedPhoto.toLowerCase().includes("svit"));
        if (savedPhoto && !isInvalid) {
          setPhoto(savedPhoto);
        } else if (isInvalid) {
          try { localStorage.removeItem('svit_idcard_photo'); } catch {}
        }
        const savedId = localStorage.getItem('svit_idcard_student_id');
        const cachedProf = sessionStorage.getItem('profile_data');
        if (cachedData) setData(JSON.parse(cachedData));
        if (cachedTimetable) setTimetable(JSON.parse(cachedTimetable));
        if (savedId) setStudentId(savedId);
        if (cachedProf) setProfileExtra(JSON.parse(cachedProf));
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

        // Background fetch photo and profile if missing
        try {
          if (!localStorage.getItem('svit_idcard_photo')) {
            fetch('/api/student/photo').then(r => r.ok ? r.json() : null).then(pJson => {
              if (pJson?.photo) {
                const isLogo = pJson.photo.toLowerCase().includes("logo") || pJson.photo.toLowerCase().includes("svit");
                if (!isLogo) {
                  setPhoto(pJson.photo);
                  try { localStorage.setItem('svit_idcard_photo', pJson.photo); } catch {}
                }
              }
            }).catch(() => {});
          }
          if (!sessionStorage.getItem('profile_data')) {
            fetch('/api/student/profile').then(r => r.ok ? r.json() : null).then(prJson => {
              if (prJson?.success && prJson?.data) {
                setProfileExtra(prJson.data);
                try { sessionStorage.setItem('profile_data', JSON.stringify(prJson.data)); } catch {}
              }
            }).catch(() => {});
          }
        } catch {}
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

  const cie = useMemo(() => {
    if (!data?.cie) return [];
    return data.cie;
  }, [data]);

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

    const dayClasses = dayData.classes || [];
    return dayClasses.map(cls => {
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
    const targetUsn = data?.usn || profileExtra?.usn;
    if (!targetUsn) return;
    saveSelfLoggedAttendance(targetUsn, courseCode, todayDateStr, status, time);
    setRefreshKey((k) => k + 1);
  };
 
  if (loading) return <div className="center-state"><div className="loader" /></div>;
  if (error) return <div className="center-state"><div className="auth-card" style={{ textAlign: "center" }}><h1 className="title">Oops</h1><p>{error}</p><button onClick={() => router.push("/")} className="button">Retry</button></div></div>;

  const handleCopyUsn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const usnToCopy = data?.usn || profileExtra?.usn || "1VA25CD092";
    if (usnToCopy) {
      navigator.clipboard.writeText(usnToCopy);
      setCopiedUsn(true);
      setTimeout(() => setCopiedUsn(false), 2000);
    }
  };

  const BRANCH_MAP = {
    "CS": "Computer Science & Engg",
    "CD": "CSE · Data Science",
    "EC": "Electronics & Communication",
    "ME": "Mechanical Engineering",
    "CV": "Civil Engineering",
    "IS": "Information Science",
    "AI": "Artificial Intelligence",
    "CI": "AI & Machine Learning",
    "CSE": "Computer Science & Engg",
    "CSE(DS)": "CSE · Data Science",
    "CSE(AI&ML)": "AI & Machine Learning",
  };

  const activeUsn = data?.usn || profileExtra?.usn || "1VA25CD092";
  const activeName = data?.profileName || profileExtra?.name || "Student";

  let branchCode = (data?.department || profileExtra?.department || "").toUpperCase();
  if (branchCode.startsWith("B.E-")) branchCode = branchCode.replace("B.E-", "");
  if (branchCode.startsWith("B.E ")) branchCode = branchCode.replace("B.E ", "");
  
  const fullBranch = BRANCH_MAP[branchCode] || (branchCode ? `B.E · ${branchCode}` : "CSE · Data Science");
  const semNum = data?.semester || profileExtra?.semester || "3";
  const semStr = `Sem ${semNum}`;
  const secStr = data?.section || "Sec B";

  let batchStr = "2025–2029";
  if (activeUsn) {
    const yrMatch = activeUsn.match(/\d{2}/);
    if (yrMatch) {
      const startYr = 2000 + parseInt(yrMatch[0], 10);
      batchStr = `${startYr}–${startYr + 4}`;
    }
  }

  const quotaStr = profileExtra?.quota || profileExtra?.categoryalloted || "VTU 2022 Scheme";
  const activeStudentId = studentId || (activeUsn ? activeUsn.slice(-5) : "25CD092");

  return (
    <main className="mobile-app-shell native-home fade-in" style={{ paddingBottom: "100px" }}>
      {/* Executive Student Profile Card */}
      <section className="home-profile-card" style={{ marginTop: 12 }}>
        <div className="home-profile-header-row">
          <div className="home-profile-badge-verified">
            <span className="home-profile-pulse-dot" />
            <ShieldCheck size={13} strokeWidth={2.6} />
            <span>Verified Student</span>
          </div>
          <Link href="/dashboard/idcard" className="home-profile-id-link">
            <span>Digital ID</span>
            <ChevronRight size={13} strokeWidth={2.4} />
          </Link>
        </div>

        <div className="home-profile-hero">
          <div className="home-avatar-frame">
            <div className="home-avatar-inner">
              <StudentAvatar name={activeName} photo={photo} />
            </div>
            <span className="home-avatar-indicator" title="Active enrollment" />
          </div>

          <div className="home-profile-details">
            <div className="home-profile-name-row">
              <h2>{activeName}</h2>
            </div>

            <div className="home-profile-chips">
              <button
                type="button"
                className="home-profile-chip"
                onClick={handleCopyUsn}
                title="Click to copy USN"
              >
                <span>{activeUsn}</span>
                {copiedUsn ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
              </button>

              <span className="home-profile-chip accent">
                ID: {activeStudentId}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Details Matrix */}
        <div className="home-profile-academic-grid">
          <div className="home-academic-item">
            <span>Department</span>
            <strong>{fullBranch}</strong>
          </div>
          <div className="home-academic-item">
            <span>Semester & Sec</span>
            <strong>{semStr} · {secStr}</strong>
          </div>
          <div className="home-academic-item">
            <span>Batch & Degree</span>
            <strong>{batchStr} · B.E</strong>
          </div>
          <div className="home-academic-item">
            <span>Scheme / Quota</span>
            <strong>{quotaStr}</strong>
          </div>
        </div>

        <div className="home-profile-footer">
          <span className="home-profile-date">
            <CalendarIcon size={13} strokeWidth={2} style={{ opacity: 0.8 }} />
            <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}</span>
          </span>
          <span className="home-profile-scheme">VTU Autonomous</span>
        </div>
      </section>

      {/* Quick Stats Strip */}
      <div className="home-stats-strip" style={{ marginTop: 16 }}>
        <div className="home-stat-pill">
          <span>Overall</span>
          <strong>{summary.avgAtt}%</strong>
          <small>Attendance</small>
        </div>
        <div className="home-stat-pill">
          <span>At Risk</span>
          <strong style={{ color: summary.lowAtt ? "var(--danger)" : "var(--success)" }}>{summary.lowAtt}</strong>
          <small>{summary.lowAtt ? "Needs ≥ 80%" : "All Good"}</small>
        </div>
        <div className="home-stat-pill">
          <span>Avg CIE</span>
          <strong>{summary.avgCie}</strong>
          <small>Scale of 50</small>
        </div>
      </div>

      {/* Today's Schedule - Directly Connected */}
      <div className="home-schedule-header">
        <h2>Today&apos;s Schedule</h2>
        <Link href="/dashboard/timetable">
          Full week <ChevronRight size={14} />
        </Link>
      </div>

      {todaySchedule && todaySchedule.length > 0 ? (
        <section className="home-schedule-list">
          {todaySchedule.map((cls, i) => {
            const courseCode = (cls.attendance?.course || cls.course).toUpperCase();
            const officialEntry = cls.attendance?.dates?.find(
              (d) => !d.isSelfLogged && (d.date === todayDateStr || d.date.replace(/\//g, "-") === todayDateStr)
            );
            const selfEntry = cls.attendance?.dates?.find(
              (d) => d.isSelfLogged && (d.date === todayDateStr || d.date.replace(/\//g, "-") === todayDateStr)
            );

            return (
              <article className="home-schedule-card" key={i}>
                <div className="home-schedule-time">
                  <span>{cls.time.split(" to ")[0]}</span>
                  {cls.status === "NOW" && <span className="home-now-badge">NOW</span>}
                  {cls.status === "NEXT" && <span className="home-next-badge">NEXT</span>}
                </div>
                <div className="home-schedule-info">
                  <h3>{cls.course}</h3>
                  <p>{cls.room ? `${cls.room} · ` : ""}{cls.faculty || "Faculty"}</p>
                </div>
                <div className="home-schedule-meta">
                  {cls.attendance && (
                    <span className={`home-schedule-pct ${toNumber(cls.attendance.percentage) < 80 ? "risk" : ""}`}>
                      {cls.attendance.percentage}%
                    </span>
                  )}
                </div>

                {/* Attendance Interactive Logging Widget */}
                <div className="home-schedule-actions">
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
                          You marked: <strong style={{ color: selfEntry.status === "Present" ? "var(--success)" : "var(--danger)" }}>{selfEntry.status === "Present" ? "Attended" : "Bunked"}</strong>
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
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        Did you attend this class?
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          type="button"
                          onClick={() => handleSaveAttendance(courseCode, "Present", cls.time)}
                          style={{ flex: 1, padding: "7px 12px", background: "rgba(52, 209, 120, 0.12)", border: "1px solid rgba(52, 209, 120, 0.25)", borderRadius: "10px", color: "var(--success)", fontWeight: 800, fontSize: "0.76rem", cursor: "pointer", transition: "all 150ms ease" }}
                        >
                          Yes, Attended
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleSaveAttendance(courseCode, "Absent", cls.time)}
                          style={{ flex: 1, padding: "7px 12px", background: "rgba(255, 91, 104, 0.12)", border: "1px solid rgba(255, 91, 104, 0.25)", borderRadius: "10px", color: "var(--danger)", fontWeight: 800, fontSize: "0.76rem", cursor: "pointer", transition: "all 150ms ease" }}
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
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginTop: 4 }}>Enjoy your day!</span>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="home-section-title" style={{ marginTop: 24 }}>
        <h2>Quick Actions</h2>
      </div>
      <nav className="home-quick-actions">
        <Link href="/dashboard/attendance" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <BarChart3 size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">Attendance</span>
        </Link>
        <Link href="/dashboard/timetable" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <Clock size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">Timetable</span>
        </Link>
        <Link href="/dashboard/bunk" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <Calculator size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">Bunk Planner</span>
        </Link>
        <Link href="/dashboard/results" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <FileText size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">CIE Marks</span>
        </Link>
        <Link href="/dashboard/marketplace" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <ShoppingBag size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">Market</span>
        </Link>
        <Link href="/dashboard/connect" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <MessageSquare size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">Connect</span>
        </Link>
        <Link href="/dashboard/idcard" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <IdCardIcon size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">ID Card</span>
        </Link>
        <Link href="/dashboard/unlocked" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <Unlock size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">Unlocked</span>
        </Link>
        <Link href="/dashboard/feedback" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <PenTool size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">Feedback</span>
        </Link>
        <Link href="/dashboard/exams" className="home-action-tile">
          <span className="home-action-icon-wrap">
            <GraduationCap size={20} strokeWidth={1.8} />
          </span>
          <span className="home-action-label">Exams</span>
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
