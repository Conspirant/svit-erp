"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSeatingInfo } from "@/lib/seatingData";
import { detectCycle, getNextExam } from "@/lib/examSchedule";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getCourseLabel = (course) => {
  if (!course) return "";
  return course.courseName ? `${course.course} - ${course.courseName}` : course.course;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bunkCourseIdx, setBunkCourseIdx] = useState("");
  const [bunkTarget, setBunkTarget] = useState(85);
  const [classesLeft, setClassesLeft] = useState("");
  const [selectedEstimate, setSelectedEstimate] = useState("");
  const [dismissSeating, setDismissSeating] = useState(false);
  const [dismissExam, setDismissExam] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Show cached data instantly if available
    queueMicrotask(() => {
      try {
        const cached = sessionStorage.getItem('dashboard_data');
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}
    });

    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/student/dashboard");
        if (res.status === 401) {
          router.push("/");
          return;
        }

        const json = await res.json();
        if (json.success) {
          setData(json.data);
          try { sessionStorage.setItem('dashboard_data', JSON.stringify(json.data)); } catch {}
        } else {
          setError(json.error || "Failed to load dashboard data.");
        }
      } catch (err) {
        setError("Could not connect to the ERP server.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  const attendance = useMemo(() => data?.attendance || [], [data]);
  const cie = useMemo(() => data?.cie || [], [data]);
  const selectedCourse = bunkCourseIdx !== "" ? attendance[Number(bunkCourseIdx)] : null;
  const targetPercentage = useMemo(() => clamp(toNumber(bunkTarget, 85), 1, 100), [bunkTarget]);
  const remainingClasses = selectedCourse ? Math.max(0, Math.floor(toNumber(classesLeft, selectedCourse.stillToGo || 0))) : 0;

  const summary = useMemo(() => {
    const averageAttendance =
      attendance.length > 0
        ? Math.round(attendance.reduce((sum, item) => sum + toNumber(item.percentage), 0) / attendance.length)
        : 0;
    const belowTarget = attendance.filter((item) => toNumber(item.percentage) < 80).length;
    const averageCie =
      cie.length > 0
        ? Math.round((cie.reduce((sum, item) => sum + toNumber(item.marks), 0) / cie.length) * 10) / 10
        : 0;

    return { averageAttendance, belowTarget, averageCie };
  }, [attendance, cie]);

  const seatingInfo = useMemo(() => {
    if (data?.usn) {
      return getSeatingInfo(data.usn);
    }
    return null;
  }, [data?.usn]);

  const examInfo = useMemo(() => {
    if (!attendance || attendance.length === 0) return null;
    const cycle = detectCycle(attendance);
    if (!cycle) return null;
    const next = getNextExam(cycle);
    return next;
  }, [attendance]);

  const handleCourseChange = (value) => {
    setBunkCourseIdx(value);
    const course = value !== "" ? attendance[Number(value)] : null;
    setClassesLeft(course?.stillToGo ?? "");
    setSelectedEstimate("");
  };

  const estimateClassesUntil = (targetDateStr) => {
    if (!selectedCourse) return 0;
    
    const targetDate = new Date(targetDateStr);
    const today = new Date();
    if (targetDate <= today) return 0;

    let classesPerDay = 0;
    const totalHeld = toNumber(selectedCourse.present) + Math.max(0, toNumber(selectedCourse.absent));

    if (selectedCourse.dates && selectedCourse.dates.length > 0) {
      const parseDate = (dStr) => {
        const p = dStr.split('-');
        return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`) : null;
      };
      const validDates = selectedCourse.dates.map(d => parseDate(d.date)).filter(Boolean);
      if (validDates.length > 0) {
        validDates.sort((a, b) => a - b);
        const firstDate = validDates[0];
        const daysElapsed = Math.max(7, (today - firstDate) / (1000 * 60 * 60 * 24));
        classesPerDay = validDates.length / daysElapsed;
      }
    }

    if (classesPerDay === 0 && totalHeld > 0) {
      const semStart = new Date(today.getFullYear(), 1, 15); // Roughly Feb 15
      const daysElapsed = Math.max(7, (today - semStart) / (1000 * 60 * 60 * 24));
      classesPerDay = totalHeld / daysElapsed;
    }

    const daysUntilTarget = (targetDate - today) / (1000 * 60 * 60 * 24);
    const estimated = Math.round(classesPerDay * daysUntilTarget);
    
    return Math.max(0, Math.min(estimated, selectedCourse.stillToGo || estimated));
  };

  const calculateBunkResult = () => {
    if (!selectedCourse) return "Choose a course to calculate attendance room.";
    if (!selectedCourse.total) return "Detailed attendance data is not available for this course.";

    const present = Math.max(0, toNumber(selectedCourse.present));
    const absent = Math.max(0, toNumber(selectedCourse.absent));
    const completed = Math.max(toNumber(selectedCourse.total), present + absent);
    const finalTotal = completed + remainingClasses;

    if (finalTotal <= 0) return "Detailed attendance data is not available for this course.";

    const requiredFinalPresent = Math.ceil((targetPercentage / 100) * finalTotal);
    const requiredToAttend = Math.max(requiredFinalPresent - present, 0);
    const canMiss = Math.max(remainingClasses - requiredToAttend, 0);
    const bestPossible = ((present + remainingClasses) / finalTotal) * 100;

    if (!remainingClasses) {
      const currentPercent = completed > 0 ? (present / completed) * 100 : toNumber(selectedCourse.percentage);
      return currentPercent >= targetPercentage
        ? `You are already at or above ${targetPercentage}%.`
        : `No remaining classes found, so this course cannot reach ${targetPercentage}% from current data.`;
    }

    if (requiredToAttend > remainingClasses) {
      return `Even if you attend every class left, you can finish at ${Math.round(bestPossible * 10) / 10}%.`;
    }

    return canMiss > 0
      ? `Attend ${requiredToAttend} of ${remainingClasses} remaining classes. You can miss ${canMiss}.`
      : `Attend all ${remainingClasses} remaining classes to stay at or above ${targetPercentage}%.`;
  };

  if (loading) {
    return (
      <div className="center-state">
        <div className="loader" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-state">
        <div className="auth-card" style={{ maxWidth: 460, textAlign: "center" }}>
          <p className="eyebrow">Dashboard unavailable</p>
          <h1 className="title">Could not load data</h1>
          <p className="subtle" style={{ marginTop: 12 }}>{error}</p>
          <button onClick={() => router.push("/")} className="button" style={{ marginTop: 22 }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Profile info line
  const branch = data?.profileData?.department || data?.profileData?.course || "";
  const sem = data?.profileData?.semester ? `Sem ${data.profileData.semester}` : "";
  const profileLine = [branch, sem].filter(Boolean).join(" · ");

  return (
    <main className="page-shell fade-in">
      <header className="app-header">
        <div>
          <p className="eyebrow">Student dashboard</p>
          <h1 className="title">Hi, {data?.profileName || "Student"}</h1>
          {profileLine && (
            <p className="subtle" style={{ marginTop: 6, fontSize: "0.85rem" }}>
              {profileLine}
            </p>
          )}
          <p className="subtle" style={{ marginTop: 4 }}>
            Your attendance, internal marks, and academic checks in one place.
          </p>
        </div>
        <button onClick={() => router.push("/")} className="button secondary">
          Logout
        </button>
      </header>

      {!dismissSeating && (
        <div 
          className="notification-banner primary-banner" 
          onClick={() => router.push('/dashboard/marketplace')}
        >
          <div style={{ flex: 1 }}>
            <h3 className="notification-title">
              Marketplace is live
            </h3>
            <p className="notification-text">
              Post academic tasks, request notes or tutoring, and earn now by completing paid work for fellow students. Tap to explore.
            </p>
          </div>
          <button 
            className="notification-dismiss" 
            onClick={(e) => { e.stopPropagation(); setDismissSeating(true); }}
          >
            Close
          </button>
        </div>
      )}

      {examInfo && !dismissExam && (
        <div className="notification-banner exam-banner">
          <div style={{ flex: 1 }}>
            <h3 className="notification-title">📝 Next Exam — {examInfo.day}, {examInfo.date.split('-').reverse().join('-')}</h3>
            <p className="notification-text" style={{ marginTop: 4 }}>
              <strong>Morning (9:30–11:00 AM):</strong> {examInfo.morning}
            </p>
            {examInfo.afternoon && (
              <p className="notification-text" style={{ marginTop: 2 }}>
                <strong>Afternoon (2:00–3:30 PM):</strong> {examInfo.afternoon}
              </p>
            )}
            <span style={{ display: "inline-block", marginTop: 6, fontSize: "0.75rem", opacity: 0.8 }}>
              {examInfo.cycleLabel} · {examInfo.semester}
            </span>
          </div>
          <button className="notification-dismiss" onClick={() => setDismissExam(true)}>
            Close
          </button>
        </div>
      )}

      <nav className="tabs" aria-label="Dashboard sections">
        <Link className="tab active" href="/dashboard">Overview</Link>
        <Link className="tab" href="/dashboard/marketplace">Marketplace</Link>
        <Link className="tab" href="/dashboard/events">Calendar</Link>
        <Link className="tab" href="/dashboard/timetable">Timetable</Link>
        <Link className="tab" href="/dashboard/info">Profile</Link>
        <Link className="tab" href="/dashboard/bunk">Bunk Calc</Link>
        <Link className="tab" href="/dashboard/connect">Connect</Link>
      </nav>

      <section className="grid overview-grid">
        <div className="metric-card span-4">
          <p className="eyebrow">Average attendance</p>
          <div className="metric-value">{summary.averageAttendance}%</div>
          <p className="subtle">Across {attendance.length || 0} course{attendance.length === 1 ? "" : "s"}</p>
        </div>
        <div className="metric-card span-4">
          <p className="eyebrow">Below 80%</p>
          <div className="metric-value" style={{ color: summary.belowTarget ? "var(--danger)" : "var(--success)" }}>
            {summary.belowTarget}
          </div>
          <p className="subtle">Course{summary.belowTarget === 1 ? "" : "s"} needing attention</p>
        </div>
        <div className="metric-card span-4">
          <p className="eyebrow">Average CIE</p>
          <div className="metric-value">{summary.averageCie || "-"}</div>
          <p className="subtle">From published internal marks</p>
        </div>

        {/* Marketplace awareness card */}
        <div
          className="mk-overview-card span-12"
          onClick={() => router.push("/dashboard/marketplace")}
          style={{ cursor: "pointer" }}
        >
          <p className="eyebrow">New Feature ✨</p>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", marginTop: 6 }}>Task Marketplace is live</h2>
          <p style={{ marginTop: 6, fontSize: "0.88rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
            Need assignment help, notes, or tutoring? Post a task and pay a fellow student to get it done — or earn money by completing tasks for others. Tap to explore.
          </p>
        </div>

        <section className="panel span-6">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Attendance</h2>
              <p className="subtle">Course-wise attendance pulled from the ERP.</p>
            </div>
            {summary.belowTarget > 0 && <span className="badge danger">{summary.belowTarget} low</span>}
          </div>

          <div className="list">
            {attendance.length > 0 ? (
              attendance.map((item, idx) => {
                const percentage = toNumber(item.percentage);
                return (
                  <div className="course-row" key={`${item.course}-${idx}`}>
                    <div className="course-top">
                      <div className="course-label">
                        <span>{item.course}</span>
                        {item.courseName && <span className="course-name">{item.courseName}</span>}
                      </div>
                      <strong style={{ color: percentage < 80 ? "var(--danger)" : "var(--success)" }}>
                        {percentage}%
                      </strong>
                    </div>
                    <div className="progress" aria-label={`${item.course} attendance ${percentage}%`}>
                      <span className={percentage < 80 ? "low" : ""} style={{ width: `${clamp(percentage, 0, 100)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="subtle">No attendance data found.</p>
            )}
          </div>
        </section>

        <section className="panel span-6">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Bunk calculator</h2>
              <p className="subtle">Uses present, absent, and still-to-go classes for the final calculation.</p>
            </div>
            {selectedCourse && (
              <span className={toNumber(selectedCourse.percentage) < targetPercentage ? "badge danger" : "badge success"}>
                {selectedCourse.percentage}%
              </span>
            )}
          </div>

          {attendance.length > 0 ? (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              <div className="field">
                <label htmlFor="course">Course</label>
                <select
                  id="course"
                  className="input"
                  value={bunkCourseIdx}
                  onChange={(e) => handleCourseChange(e.target.value)}
                >
                  <option value="">Choose course</option>
                  {attendance.map((course, idx) => (
                    <option key={`${course.course}-${idx}`} value={idx}>
                      {getCourseLabel(course)} ({course.percentage}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="target">Target percentage</label>
                <input
                  id="target"
                  type="number"
                  min="1"
                  max="100"
                  className="input"
                  value={bunkTarget}
                  onChange={(e) => setBunkTarget(e.target.value)}
                  onBlur={() => setBunkTarget(targetPercentage)}
                />
              </div>

              <div className="field">
                <label htmlFor="classes-left">Classes still to go</label>
                <input
                  id="classes-left"
                  type="number"
                  min="0"
                  className="input"
                  value={classesLeft}
                  placeholder={String(selectedCourse?.stillToGo ?? 0)}
                  onChange={(e) => {
                    setClassesLeft(e.target.value);
                    setSelectedEstimate("");
                  }}
                  onBlur={() => setClassesLeft(remainingClasses)}
                />
                <div className="quick-options" style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--subtle-color)" }}>Estimate for:</span>
                  <button 
                    type="button" 
                    className="badge" 
                    style={{ 
                      cursor: "pointer", 
                      border: "1px solid var(--border)", 
                      background: selectedEstimate === "ia1" ? "var(--primary)" : "transparent",
                      color: selectedEstimate === "ia1" ? "var(--background, white)" : "inherit"
                    }} 
                    onClick={() => { setClassesLeft(estimateClassesUntil("2026-04-27")); setSelectedEstimate("ia1"); }}
                  >
                    IA 1
                  </button>
                  <button 
                    type="button" 
                    className="badge" 
                    style={{ 
                      cursor: "pointer", 
                      border: "1px solid var(--border)", 
                      background: selectedEstimate === "ia2" ? "var(--primary)" : "transparent",
                      color: selectedEstimate === "ia2" ? "var(--background, white)" : "inherit"
                    }} 
                    onClick={() => { setClassesLeft(estimateClassesUntil("2026-06-08")); setSelectedEstimate("ia2"); }}
                  >
                    IA 2
                  </button>
                  <button 
                    type="button" 
                    className="badge" 
                    style={{ 
                      cursor: "pointer", 
                      border: "1px solid var(--border)", 
                      background: selectedEstimate === "overall" ? "var(--primary)" : "transparent",
                      color: selectedEstimate === "overall" ? "var(--background, white)" : "inherit"
                    }} 
                    onClick={() => { setClassesLeft(selectedCourse?.stillToGo ?? 0); setSelectedEstimate("overall"); }}
                  >
                    Overall (SEE)
                  </button>
                </div>
              </div>

              <div className="soft-box" style={{ alignSelf: "end" }}>
                <strong>{calculateBunkResult()}</strong>
              </div>
            </div>
          ) : (
            <p className="subtle">No attendance data available for planning.</p>
          )}

          {selectedCourse?.total > 0 && (
            <>
              <div className="stat-strip" style={{ marginTop: 16 }}>
                <div className="soft-box">
                  <span className="stat-number" style={{ color: "var(--success)" }}>{selectedCourse.present}</span>
                  <span className="subtle">Present</span>
                </div>
                <div className="soft-box">
                  <span className="stat-number" style={{ color: "var(--danger)" }}>{selectedCourse.absent}</span>
                  <span className="subtle">Absent</span>
                </div>
                <div className="soft-box">
                  <span className="stat-number">{remainingClasses}</span>
                  <span className="subtle">Still to go</span>
                </div>
              </div>

              {selectedCourse.dates?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 className="panel-title" style={{ marginBottom: 10 }}>Attendance timeline</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCourse.dates.map((entry, idx) => (
                          <tr key={`${entry.date}-${entry.time}-${idx}`}>
                            <td>{entry.date}</td>
                            <td>{entry.time}</td>
                            <td style={{ color: entry.status === "Present" ? "var(--success)" : "var(--danger)", fontWeight: 800 }}>
                              {entry.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="panel span-12">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Internal marks</h2>
              <p className="subtle">Latest CIE values available in the portal.</p>
            </div>
          </div>

          <div className="list">
            {cie.length > 0 ? (
              cie.map((item, idx) => (
                <div className="course-row" key={`${item.course}-${idx}`}>
                  <div className="course-top" style={{ marginBottom: 0 }}>
                    <div className="course-label">
                      <span>{item.course}</span>
                      {item.courseName && <span className="course-name">{item.courseName}</span>}
                    </div>
                    <strong style={{ color: "var(--primary)" }}>{item.marks}</strong>
                  </div>
                </div>
              ))
            ) : (
              <p className="subtle">No internal marks data found.</p>
            )}
          </div>
        </section>

        {data?.pageTitle && (
          <section className="panel span-12">
            <p className="eyebrow">Portal note</p>
            <p className="subtle" style={{ marginTop: 8 }}>{data.pageTitle}</p>
          </section>
        )}
      </section>
    </main>
  );
}
