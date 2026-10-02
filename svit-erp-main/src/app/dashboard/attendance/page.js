"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getMergedAttendance, saveSelfLoggedAttendance, filterElectives } from "@/lib/clientApi";

const SEMESTER_END_DATE = new Date("2026-06-15T23:59:59");

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getCourseName(item) {
  return item.courseName || item.course || "Course";
}

function getAttendanceMetrics(item, target, remainingCalculated, milestone = "overall", milestoneDate = null) {
  const present = toNumber(item.present);
  const absent = toNumber(item.absent);
  const total = Math.max(toNumber(item.total), present + absent);
  const percentage = toNumber(item.percentage, total > 0 ? Math.round((present / total) * 100) : 0);

  const now = new Date();
  const isPastMilestone = milestoneDate && now >= milestoneDate;

  // For overall, official "STILL TO GO" directly from ERP has highest priority
  const stillToGoOfficial = toNumber(item.stillToGo, 0);
  const remaining = milestone === "overall" && stillToGoOfficial > 0 
    ? stillToGoOfficial 
    : Math.max(0, remainingCalculated);
  const projectedTotal = total + remaining;

  const milestoneName = milestone === "ia1" ? "IA 1" : milestone === "ia2" ? "IA 2" : "semester";

  if (isPastMilestone && milestone !== "overall") {
    return {
      remaining: 0,
      canMiss: 0,
      mustAttend: 0,
      projectedTotal: total,
      isReachable: percentage >= target,
      statusType: percentage >= target ? "safe" : "risk",
      headline: `${milestoneName} completed (${percentage}%)`,
      subtext: `Switch to ${milestone === "ia1" ? "IA 2 or Overall" : "Overall"} to track upcoming classes.`
    };
  }

  if (projectedTotal === 0 || remaining === 0) {
    const isMet = percentage >= target;
    return {
      remaining: 0,
      canMiss: 0,
      mustAttend: 0,
      projectedTotal: total,
      isReachable: isMet,
      statusType: isMet ? "safe" : "risk",
      headline: isMet 
        ? `Target ${target}% reached (${percentage}%)` 
        : `Below ${target}% target (${percentage}%)`,
      subtext: `No upcoming classes till ${milestoneName}.`
    };
  }

  // To maintain >= target% at milestone:
  // (present + x) / projectedTotal >= target / 100
  // present + x >= ceil((target / 100) * projectedTotal)
  const neededTotalPresent = Math.ceil((target / 100) * projectedTotal);
  const mustAttend = Math.max(0, neededTotalPresent - present);
  const canMiss = remaining - mustAttend;
  const isReachable = mustAttend <= remaining;
  const maxPossiblePct = Math.round(((present + remaining) / projectedTotal) * 100);

  // Consecutive classes needed right now to pull current % up to target:
  let immediateCatchUp = 0;
  if (percentage < target && target < 100) {
    immediateCatchUp = Math.max(0, Math.ceil((target * total - 100 * present) / (100 - target)));
  }

  let statusType = "safe";
  let headline = "";
  let subtext = "";

  const milestoneSuffix = milestone === "ia1" ? " till IA 1" : milestone === "ia2" ? " till IA 2" : "";
  const milestoneTargetLabel = milestone === "ia1" ? " at IA 1" : milestone === "ia2" ? " at IA 2" : "";

  if (!isReachable) {
    statusType = "risk";
    headline = `Target ${target}% unreachable${milestoneSuffix} (${remaining} left)`;
    subtext = `Max possible is ${maxPossiblePct}% even if you attend all remaining classes.`;
  } else if (canMiss > 0) {
    statusType = percentage >= target ? "safe" : "warning";
    headline = `Can miss ${canMiss} of ${remaining} upcoming classes${milestoneSuffix}`;
    subtext = immediateCatchUp > 0
      ? `Need ${mustAttend} to finish ≥ ${target}%. Attend next ${immediateCatchUp} to recover.`
      : `Attend at least ${mustAttend} to finish ≥ ${target}% • ${projectedTotal} total${milestoneTargetLabel}`;
  } else {
    statusType = "warning";
    headline = `Must attend all ${remaining} remaining classes${milestoneSuffix}`;
    subtext = `0 skips allowed to stay at or above ${target}% • ${projectedTotal} total${milestoneTargetLabel}`;
  }

  return {
    remaining,
    canMiss: Math.max(0, canMiss),
    mustAttend,
    projectedTotal,
    isReachable,
    maxPossiblePct,
    immediateCatchUp,
    statusType,
    headline,
    subtext
  };
}

function AttendanceCard({ item, classesRemaining, target, index, usn, milestone = "overall", milestoneDate = null }) {
  const [isLogOpen, setIsLogOpen] = useState(false);

  let remainingCalculated = 0;
  Object.entries(classesRemaining).forEach(([cName, count]) => {
    if (
      cName.includes(item.course.toUpperCase()) || 
      (item.courseName && cName.includes(item.courseName.toUpperCase())) || 
      (item.courseName && item.courseName.toUpperCase().includes(cName))
    ) {
      remainingCalculated = Math.max(remainingCalculated, count);
    }
  });
  
  const percentage = toNumber(item.percentage);
  const present = toNumber(item.present);
  const total = Math.max(toNumber(item.total), present + toNumber(item.absent));
  const metrics = getAttendanceMetrics(item, target, remainingCalculated, milestone, milestoneDate);

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

        <p className={metrics.statusType === "risk" ? "risk-text" : metrics.statusType === "warning" ? "warning-text" : "safe-text"} style={{ marginTop: "10px", fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.3 }}>
          {metrics.headline}
        </p>
        {metrics.subtext && (
          <p style={{ marginTop: "2px", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, lineHeight: 1.35 }}>
            {metrics.subtext}
          </p>
        )}
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

function extractExamDates(eventsData) {
  const dates = {
    ia1: null,
    ia2: null,
    end: null
  };

  if (!eventsData || !Array.isArray(eventsData) || eventsData.length === 0) {
    return {
      ia1: new Date("2026-10-23T00:00:00"),
      ia2: new Date("2026-12-21T00:00:00"),
      end: new Date("2026-12-30T23:59:59")
    };
  }

  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  eventsData.forEach(monthItem => {
    const monthStr = monthItem.month || "";
    const mMatch = monthStr.match(/([a-zA-Z]+)[-_ ]+(\d{4})/);
    const year = mMatch ? parseInt(mMatch[2], 10) : new Date().getFullYear();
    const monthName = mMatch ? mMatch[1].toLowerCase() : "";
    const monthIdx = monthMap[monthName.slice(0, 3)] ?? -1;

    (monthItem.events || []).forEach(ev => {
      const lower = ev.toLowerCase();
      const dayMatch = ev.match(/(\d+)(?:st|nd|rd|th)?/);
      const dayNum = dayMatch ? parseInt(dayMatch[1], 10) : 1;

      if (/minor\s*exam\s*1|ia\s*[-_ ]?1/i.test(lower) && !dates.ia1) {
        if (monthIdx !== -1) dates.ia1 = new Date(year, monthIdx, dayNum, 0, 0, 0);
      } else if (/minor\s*exam\s*2|ia\s*[-_ ]?2/i.test(lower) && !dates.ia2) {
        if (monthIdx !== -1) dates.ia2 = new Date(year, monthIdx, dayNum, 0, 0, 0);
      } else if (/last\s*working\s*day|semester\s*end/i.test(lower) && !dates.end) {
        if (monthIdx !== -1) dates.end = new Date(year, monthIdx, dayNum, 23, 59, 59);
      }
    });

    if (!dates.ia1 || !dates.ia2) {
      const examDays = (monthItem.days || []).filter(d => d.type === "exam" && d.day);
      if (examDays.length > 0 && monthIdx !== -1) {
        const firstDay = parseInt(examDays[0].day, 10);
        if (!dates.ia1) {
          dates.ia1 = new Date(year, monthIdx, firstDay, 0, 0, 0);
        } else if (!dates.ia2 && (monthIdx > dates.ia1.getMonth() || firstDay > dates.ia1.getDate() + 10)) {
          dates.ia2 = new Date(year, monthIdx, firstDay, 0, 0, 0);
        }
      }
    }
  });

  return {
    ia1: dates.ia1 || new Date("2026-10-23T00:00:00"),
    ia2: dates.ia2 || new Date("2026-12-21T00:00:00"),
    end: dates.end || new Date("2026-12-30T23:59:59")
  };
}

export default function AttendancePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [eventsData, setEventsData] = useState(null);
  const [milestone, setMilestone] = useState("overall"); // "overall" | "ia1" | "ia2"
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
      const cachedEv = (() => {
        try { return JSON.parse(sessionStorage.getItem("events_data") || "null"); } catch { return null; }
      })();
      if (cached) {
        setData(cached);
        if (cachedTt) setTimetable(cachedTt);
        if (cachedEv) setEventsData(cachedEv);
        setLoading(false);
      }
    });

    Promise.all([
      apiFetch("/api/student/dashboard"),
      apiFetch("/api/student/timetable").catch(() => ({ data: [] })),
      apiFetch("/api/student/events").catch(() => ({ data: [] }))
    ])
      .then(([dashJson, ttJson, evJson]) => {
        if (!alive) return;
        setData(dashJson.data);
        if (ttJson.data) setTimetable(ttJson.data);
        if (evJson.data) setEventsData(evJson.data);
        try { sessionStorage.setItem("dashboard_data", JSON.stringify(dashJson.data)); } catch { }
        try { if (ttJson.data) sessionStorage.setItem("dashboard_timetable", JSON.stringify(ttJson.data)); } catch { }
        try { if (evJson.data) sessionStorage.setItem("events_data", JSON.stringify(evJson.data)); } catch { }
      })
      .catch((err) => alive && setError(err.message || "Could not load attendance."))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [router]);

  const examDates = useMemo(() => extractExamDates(eventsData), [eventsData]);

  const activeMilestoneDate = useMemo(() => {
    if (milestone === "ia1") return examDates.ia1;
    if (milestone === "ia2") return examDates.ia2;
    return examDates.end;
  }, [milestone, examDates]);

  const classesRemaining = useMemo(() => {
    const counts = {};
    if (!timetable || !activeMilestoneDate) return counts;
    const now = new Date();
    if (now >= activeMilestoneDate) return counts;

    // Collect holiday & exam dates from calendar
    const holidaySet = new Set();
    const monthMap = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    (eventsData || []).forEach(m => {
      const mMatch = (m.month || "").match(/([a-zA-Z]+)[-_ ]+(\d{4})/);
      if (!mMatch) return;
      const year = parseInt(mMatch[2], 10);
      const mIdx = monthMap[mMatch[1].toLowerCase().slice(0, 3)];
      if (mIdx === undefined) return;

      (m.days || []).forEach(d => {
        if ((d.type === "holiday" || d.type === "exam") && d.day) {
          const dNum = parseInt(d.day, 10);
          holidaySet.add(`${year}-${mIdx}-${dNum}`);
        }
      });
    });

    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const dayCounts = { SUNDAY: 0, MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0, SATURDAY: 0 };

    let current = new Date(now);
    current.setHours(0, 0, 0, 0);

    const end = new Date(activeMilestoneDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const dayOfWeek = dayNames[current.getDay()];
      const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
      if (dayOfWeek !== "SUNDAY" && !holidaySet.has(key)) {
        dayCounts[dayOfWeek]++;
      }
      current.setDate(current.getDate() + 1);
    }

    timetable.forEach(day => {
      const dayName = day.day.toUpperCase();
      const occurrences = dayCounts[dayName] || 0;
      if (occurrences > 0 && day.classes) {
        const filteredClasses = filterElectives(day.classes, (cls) => cls.course);
        filteredClasses.forEach(cls => {
          const cName = cls.course.toUpperCase();
          counts[cName] = (counts[cName] || 0) + occurrences;
        });
      }
    });

    return counts;
  }, [timetable, eventsData, activeMilestoneDate, refreshKey]);

  const attendance = useMemo(() => {
    if (!data) return [];
    return filterElectives(getMergedAttendance(data.attendance, data.usn));
  }, [data, refreshKey]);

  const overall = useMemo(() => {
    if (!attendance.length) return 0;
    return Math.round(attendance.reduce((sum, item) => sum + toNumber(item.percentage), 0) / attendance.length);
  }, [attendance]);

  if (loading) return <div className="center-state"><div className="loader" /></div>;
  if (error) return <div className="center-state"><div className="notice error">{error}</div></div>;

  const milestoneDateFormatted = activeMilestoneDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <main className="page-shell fade-in native-screen">
      <section className="native-page-head">
        <div>
          <h1>Attendance</h1>
          <p>Overall: {overall || "-"}%</p>
        </div>
      </section>

      <section className="native-control-card">
        <div className="attendance-milestone-row">
          <span>Target Period</span>
          <div className="attendance-milestone-tabs">
            <button
              type="button"
              className={`attendance-milestone-tab ${milestone === "overall" ? "active" : ""}`}
              onClick={() => setMilestone("overall")}
            >
              Overall
            </button>
            <button
              type="button"
              className={`attendance-milestone-tab ${milestone === "ia1" ? "active" : ""}`}
              onClick={() => setMilestone("ia1")}
            >
              IA 1
            </button>
            <button
              type="button"
              className={`attendance-milestone-tab ${milestone === "ia2" ? "active" : ""}`}
              onClick={() => setMilestone("ia2")}
            >
              IA 2
            </button>
          </div>
        </div>

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

        <div className="attendance-presets-row">
          {[75, 80, 85, 90].map((pct) => (
            <button
              key={pct}
              type="button"
              className={`attendance-preset-btn ${target === pct ? "active" : ""}`}
              onClick={() => setTarget(pct)}
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="attendance-date-row">
          <span>{milestone === "ia1" ? "IA 1 Exam" : milestone === "ia2" ? "IA 2 Exam" : "Semester ends"}</span>
          <time>{milestoneDateFormatted}</time>
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
            milestone={milestone}
            milestoneDate={activeMilestoneDate}
          />
        )) : <p className="subtle">No attendance data found.</p>}
      </section>
    </main>
  );
}
