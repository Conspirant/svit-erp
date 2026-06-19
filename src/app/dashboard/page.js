"use client";
 
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMergedAttendance, saveSelfLoggedAttendance, filterElectives } from "@/lib/clientApi";
import { EXAM_DATABASE } from "@/lib/examSchedule";
 
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
  const [electives, setElectives] = useState(null);
  const [showElectivePrompt, setShowElectivePrompt] = useState(false);
  const [tempKannada, setTempKannada] = useState("samskrutika");
  const [tempEsc, setTempEsc] = useState("electricals");
  const router = useRouter();
 
  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener("attendanceChanged", handleUpdate);
    return () => window.removeEventListener("attendanceChanged", handleUpdate);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("selected_electives");
      if (raw) {
        setElectives(JSON.parse(raw));
      } else {
        setShowElectivePrompt(true);
      }
    } catch (e) {}
  }, [refreshKey]);

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
    const merged = getMergedAttendance(data.attendance, data.usn);
    return filterElectives(merged);
  }, [data, refreshKey, electives]);

  const cie = useMemo(() => {
    if (!data?.cie) return [];
    return filterElectives(data.cie);
  }, [data, electives]);

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

    const filteredClasses = filterElectives(dayData.classes, (cls) => cls.course);
    return filteredClasses.map(cls => {
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
  }, [timetable, attendance, electives]);

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
  const handleSaveElectives = (kannada, esc) => {
    const obj = { kannada, esc };
    try {
      localStorage.setItem("selected_electives", JSON.stringify(obj));
      setElectives(obj);
      setShowElectivePrompt(false);
      window.dispatchEvent(new Event("attendanceChanged"));
    } catch (e) {}
  };

  const registeredExams = useMemo(() => {
    if (!data) return [];
    
    const clean = (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const merged = getMergedAttendance(data.attendance, data.usn);
    const homepageCourses = filterElectives(merged);
    
    const isRegistered = (examCode) => {
      const normalizedExam = clean(examCode);
      
      return homepageCourses.some((registered) => {
        const normalizedReg = clean(registered.course);
        
        if (normalizedReg === normalizedExam) return true;
        if (normalizedReg.includes(normalizedExam) || normalizedExam.includes(normalizedReg)) return true;
        
        const regNoK = normalizedReg.replace(/^([A-Z0-9]{5})K/, "$1");
        const exNoK = normalizedExam.replace(/^([A-Z0-9]{5})K/, "$1");
        if (regNoK === exNoK) return true;

        if (registered.courseName && examCode) {
          const exam = EXAM_DATABASE.find((e) => e.code === examCode);
          if (exam && exam.title) {
            const cleanName = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
            const regName = cleanName(registered.courseName);
            const exName = cleanName(exam.title);
            if (regName.includes(exName) || exName.includes(regName)) return true;
          }
        }

        return false;
      });
    };

    const getSemDigit = (c) => {
      const withoutLeading = c.substring(1);
      const match = withoutLeading.match(/\d/);
      return match ? match[0] : null;
    };

    const list = EXAM_DATABASE.filter((exam) => {
      const examCodeClean = clean(exam.code);
      
      const match = homepageCourses.find((registered) => {
        const normalizedReg = clean(registered.course);
        const regSem = getSemDigit(normalizedReg);
        const examSem = getSemDigit(examCodeClean);
        
        if (regSem && examSem && regSem !== examSem) {
          return false;
        }
        
        return isRegistered(exam.code);
      });
      
      return !!match;
    });

    return [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data, refreshKey, electives]);

  const getCountdown = (examDateStr) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateStr);
    examDate.setHours(0, 0, 0, 0);
    
    const diffTime = examDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { label: "Today", type: "today" };
    if (diffDays === 1) return { label: "Tomorrow", type: "tomorrow" };
    if (diffDays > 1) return { label: `In ${diffDays}d`, type: "upcoming" };
    return { label: "Done", type: "past" };
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

      {/* Elective Subjects Selector Card */}
      {showElectivePrompt && (
        <section className="panel fade-in" style={{ margin: "16px 12px 0", border: "1px solid var(--primary)", background: "rgba(35, 102, 84, 0.03)", boxShadow: "0 4px 20px rgba(35, 102, 84, 0.05)", borderRadius: "14px" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 850, color: "var(--ink)", marginBottom: "4px" }}>🎒 Configure Your Electives</h2>
          <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginBottom: "12px", lineHeight: "1.4" }}>
            Select your elective subjects to clean up your timetable, attendance, and results.
          </p>

          <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
            {/* Kannada Selection */}
            <div style={{ display: "grid", gap: "4px" }}>
              <label style={{ fontSize: "0.74rem", fontWeight: 750, color: "var(--ink)" }}>Kannada Course</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setTempKannada("samskrutika")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    background: tempKannada === "samskrutika" ? "var(--primary)" : "var(--surface-soft)",
                    color: tempKannada === "samskrutika" ? "#fff" : "var(--muted)",
                    border: tempKannada === "samskrutika" ? "1px solid var(--primary)" : "1px solid var(--line)",
                    transition: "all 150ms ease"
                  }}
                >
                  Samskrutika
                </button>
                <button
                  type="button"
                  onClick={() => setTempKannada("balake")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    background: tempKannada === "balake" ? "var(--primary)" : "var(--surface-soft)",
                    color: tempKannada === "balake" ? "#fff" : "var(--muted)",
                    border: tempKannada === "balake" ? "1px solid var(--primary)" : "1px solid var(--line)",
                    transition: "all 150ms ease"
                  }}
                >
                  Balake
                </button>
              </div>
            </div>

            {/* ESC Selection */}
            <div style={{ display: "grid", gap: "4px", marginTop: "4px" }}>
              <label style={{ fontSize: "0.74rem", fontWeight: 750, color: "var(--ink)" }}>Engineering Elective</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setTempEsc("electricals")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    background: tempEsc === "electricals" ? "var(--accent)" : "var(--surface-soft)",
                    color: tempEsc === "electricals" ? "#fff" : "var(--muted)",
                    border: tempEsc === "electricals" ? "1px solid var(--accent)" : "1px solid var(--line)",
                    transition: "all 150ms ease"
                  }}
                >
                  Electricals
                </button>
                <button
                  type="button"
                  onClick={() => setTempEsc("building")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    background: tempEsc === "building" ? "var(--accent)" : "var(--surface-soft)",
                    color: tempEsc === "building" ? "#fff" : "var(--muted)",
                    border: tempEsc === "building" ? "1px solid var(--accent)" : "1px solid var(--line)",
                    transition: "all 150ms ease"
                  }}
                >
                  Building Sci.
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSaveElectives(tempKannada, tempEsc)}
            style={{
              width: "100%",
              padding: "10px",
              background: "var(--primary)",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "0.8rem",
              fontWeight: 850,
              cursor: "pointer",
              border: "none",
              boxShadow: "0 4px 10px rgba(35, 102, 84, 0.2)",
              transition: "all 150ms ease"
            }}
          >
            Confirm Electives
          </button>
        </section>
      )}

      {/* Quick Edit Electives Badge (if already configured) */}
      {!showElectivePrompt && electives && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 12px 0", padding: "10px 14px", background: "var(--surface-soft)", borderRadius: "12px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.76rem", color: "var(--muted)", fontWeight: 700 }}>
            Electives: <strong style={{ color: "var(--primary)" }}>{electives.kannada === "samskrutika" ? "Samskrutika" : "Balake"}</strong> &middot; <strong style={{ color: "var(--accent)" }}>{electives.esc === "electricals" ? "Electricals" : "Building Sci."}</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowElectivePrompt(true)}
            style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Change
          </button>
        </div>
      )}

      {/* Quick Stats Strip */}
      <div className="home-stats-strip" style={{ marginTop: showElectivePrompt || electives ? 16 : 12 }}>
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
      {/* Upcoming Exams Panel */}
      {registeredExams.length > 0 && (
        <section 
          className="panel fade-in" 
          style={{ 
            margin: "16px 12px 0", 
            border: "1px solid var(--line)", 
            borderRadius: "14px", 
            background: "var(--surface)",
            padding: "16.5px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 850, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              📋 Upcoming VTU Exams
            </h3>
            <Link 
              href="/dashboard/exams" 
              style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--primary)", textDecoration: "none" }}
            >
              View Full Schedule &rarr;
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {registeredExams.map((exam, idx) => {
              const countdown = getCountdown(exam.date);
              const isToday = countdown.type === "today";
              const isPast = countdown.type === "past";
              
              if (isPast) return null;

              const [y, m, d] = exam.date.split("-");
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const formattedDate = `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;

              return (
                <div 
                  key={`${exam.code}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: isToday ? "rgba(183, 51, 51, 0.04)" : "var(--surface-soft)",
                    border: isToday ? "1px solid rgba(183, 51, 51, 0.2)" : "1px solid var(--line)",
                    borderRadius: "10px",
                    fontSize: "0.8rem"
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ color: "var(--ink)", fontWeight: 800 }}>{exam.code}</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>• {formattedDate} ({exam.day})</span>
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                      {exam.title}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span 
                      style={{ 
                        fontSize: "0.72rem", 
                        fontWeight: 900, 
                        color: isToday ? "var(--danger)" : countdown.type === "tomorrow" ? "var(--warning)" : "var(--primary)",
                        textTransform: "uppercase" 
                      }}
                    >
                      {countdown.label}
                    </span>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "2px" }}>
                      9:30 AM
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
          <span className="home-action-label">Bunk Planner</span>
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
        <Link href="/dashboard/unlocked" className="home-action-tile">
          <span className="home-action-icon">🔓</span>
          <span className="home-action-label">Unlocked</span>
        </Link>
        <Link href="/dashboard/feedback" className="home-action-tile">
          <span className="home-action-icon">✍️</span>
          <span className="home-action-label">Feedback</span>
        </Link>
        <Link href="/dashboard/exams" className="home-action-tile">
          <span className="home-action-icon">📋</span>
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
