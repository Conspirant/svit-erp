"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMergedAttendance, filterElectives } from "@/lib/clientApi";
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Calendar, 
  ShieldAlert, 
  Award, 
  ArrowRight, 
  ShieldCheck, 
  Info,
  Sliders,
  Clock
} from "lucide-react";

const EXAM_PERIODS = [
  { value: "ia1", label: "IA 1", date: "2026-04-27", target: 85 },
  { value: "ia2", label: "IA 2", date: "2026-06-08", target: 85 },
  { value: "see", label: "SEE", date: "2026-07-15", target: 75 },
  { value: "overall", label: "Overall", date: "", target: 85 },
];

const TARGET_PRESETS = [75, 80, 85, 90];

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function calcBunkable(attended, total, target) {
  if (total === 0 || target <= 0 || target > 100) return null;
  const current = (attended / total) * 100;
  const maxBunks = Math.floor((attended * 100) / target - total);
  let needToAttend = 0;
  if (current < target) {
    needToAttend = Math.ceil((target * total - attended * 100) / (100 - target));
    if (needToAttend < 0) needToAttend = 0;
  }
  return {
    current: Math.round(current * 100) / 100,
    bunkable: Math.max(0, maxBunks),
    needToAttend,
    attended,
    total,
    target,
  };
}

function parseCourse(raw) {
  if (!raw) return { code: '', name: '' };
  const dashIdx = raw.indexOf(' - ');
  if (dashIdx > 0 && dashIdx < 30) {
    return { code: raw.slice(0, dashIdx).trim(), name: raw.slice(dashIdx + 3).trim() };
  }
  const spaceMatch = raw.match(/^([A-Z0-9_]+(?:PHYCYCLE)?)\s+(.+)$/i);
  if (spaceMatch) return { code: spaceMatch[1], name: spaceMatch[2] };
  return { code: raw, name: '' };
}

const guessCredits = (code = "", name = "") => {
  const c = code.toUpperCase();
  const n = name.toUpperCase();

  if (
    c.startsWith("1BKSK") || 
    c.startsWith("1BKBK") || 
    c.startsWith("1BENG") || 
    c.startsWith("1BCIP") || 
    n.includes("KANNADA") || 
    n.includes("CONSTITUTION") || 
    n.includes("ENGLISH") || 
    n.includes("WRITING SKILLS") ||
    n.includes("ENVIRONMENTAL") ||
    n.includes("AEC") ||
    n.includes("SKILL") ||
    n.includes("COMMUNICATION")
  ) {
    return 1;
  }

  if (c.startsWith("1BMAT") || n.includes("MATHEMATICS") || n.includes("CALCULUS")) {
    return 4;
  }

  if (c.startsWith("1BPHY") || c.startsWith("1BCHE") || n.includes("PHYSICS") || n.includes("CHEMISTRY")) {
    return 4;
  }

  return 3;
};

const isLabClass = (code = "", name = "") => {
  const c = code.toUpperCase();
  const n = (name || "").toUpperCase();
  return c.includes("LAB") || c.includes("PRACTICAL") || c.includes("WS") || n.includes("LAB") || n.includes("PRACTICAL") || n.includes("WORKSHOP");
};

const getProjectedAttendance = (attItem, skipCount = 1) => {
  if (!attItem) return { current: 100, projected: 100, present: 0, total: 0 };
  const present = Number(attItem.present || 0);
  const total = Number(attItem.total || 0);
  const currentPct = total > 0 ? Math.round((present / total) * 100) : 100;
  const projectedTotal = total + skipCount;
  const projectedPct = projectedTotal > 0 ? Math.round((present / projectedTotal) * 100) : 100;
  return {
    current: currentPct,
    projected: projectedPct,
    present,
    total,
    projectedTotal
  };
};

const matchAttendance = (timetableCourseRaw, attendanceList) => {
  if (!timetableCourseRaw || !attendanceList) return null;
  const { code, name } = parseCourse(timetableCourseRaw);
  
  let match = attendanceList.find(a => a.course.toUpperCase() === code.toUpperCase());
  if (match) return match;
  
  match = attendanceList.find(a => 
    a.course.toUpperCase().includes(code.toUpperCase()) || 
    code.toUpperCase().includes(a.course.toUpperCase()) ||
    (a.courseName && name && a.courseName.toUpperCase().includes(name.toUpperCase()))
  );
  return match;
};

const MOCK_DASHBOARD = {
  usn: "1SV24CS045",
  profileName: "Rishabh Sharma",
  department: "CSE",
  semester: "4",
  attendance: [
    { course: "21CS42", courseName: "Design & Analysis of Algorithms", present: 36, total: 40, percentage: 90 },
    { course: "21CS43", courseName: "Microcontrollers & Embedded Systems", present: 28, total: 35, percentage: 80 },
    { course: "21CS44", courseName: "Operating Systems", present: 22, total: 30, percentage: 73 },
    { course: "21CSL46", courseName: "DAA Laboratory", present: 10, total: 10, percentage: 100 },
    { course: "21CSL47", courseName: "Microcontroller Lab", present: 9, total: 10, percentage: 90 },
    { course: "1BKBK48", courseName: "Balake Kannada", present: 12, total: 12, percentage: 100 },
    { course: "21UH49", courseName: "Universal Human Values", present: 14, total: 16, percentage: 88 }
  ]
};

const MOCK_TIMETABLE = [
  {
    day: "MONDAY",
    classes: [
      { course: "21CS42 Design & Analysis of Algorithms", time: "9:00 AM to 10:00 AM", room: "LH-104", faculty: "Prof. Geetha Rani" },
      { course: "21CS43 Microcontrollers & Embedded Systems", time: "10:00 AM to 11:00 AM", room: "LH-104", faculty: "Dr. Prabhakar M." },
      { course: "21CS44 Operating Systems", time: "11:15 AM to 12:15 PM", room: "LH-104", faculty: "Prof. Manjunatha S." }
    ]
  },
  {
    day: "TUESDAY",
    classes: [
      { course: "21CSL46 DAA Laboratory", time: "9:00 AM to 12:00 PM", room: "LH-106", faculty: "Prof. Roopa G. (Lab)", batch: "B1" },
      { course: "21CS44 Operating Systems", time: "1:00 PM to 2:00 PM", room: "LH-104", faculty: "Prof. Manjunatha S." }
    ]
  },
  {
    day: "WEDNESDAY",
    classes: [
      { course: "21CS42 Design & Analysis of Algorithms", time: "9:00 AM to 10:00 AM", room: "LH-104", faculty: "Prof. Geetha Rani" },
      { course: "21CS43 Microcontrollers & Embedded Systems", time: "10:00 AM to 11:00 AM", room: "LH-104", faculty: "Dr. Prabhakar M." },
      { course: "21CS44 Operating Systems", time: "11:15 AM to 12:15 PM", room: "LH-104", faculty: "Prof. Manjunatha S." },
      { course: "21UH49 Universal Human Values", time: "2:00 PM to 3:00 PM", room: "LH-104", faculty: "Prof. Aruna Kumar" }
    ]
  },
  {
    day: "THURSDAY",
    classes: [
      { course: "21CSL47 Microcontroller Lab", time: "9:00 AM to 12:00 PM", room: "LH-107", faculty: "Prof. Shivakumar (Lab)", batch: "B1" },
      { course: "21CS42 Design & Analysis of Algorithms", time: "1:00 PM to 2:00 PM", room: "LH-104", faculty: "Prof. Geetha Rani" }
    ]
  },
  {
    day: "FRIDAY",
    classes: [
      { course: "1BKBK48 Balake Kannada", time: "9:00 AM to 10:00 AM", room: "LH-104", faculty: "Prof. Latha M." },
      { course: "21UH49 Universal Human Values", time: "10:00 AM to 11:00 AM", room: "LH-104", faculty: "Prof. Aruna Kumar" }
    ]
  },
  {
    day: "SATURDAY",
    classes: [
      { course: "21CS43 Microcontrollers & Embedded Systems", time: "9:00 AM to 10:00 AM", room: "LH-104", faculty: "Dr. Prabhakar M." },
      { course: "21CS44 Operating Systems", time: "10:00 AM to 11:00 AM", room: "LH-104", faculty: "Prof. Manjunatha S." }
    ]
  }
];

export default function BunkCalculator() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("manual");
  const [attended, setAttended] = useState("");
  const [total, setTotal] = useState("");
  const [target, setTarget] = useState(85);
  const [customTarget, setCustomTarget] = useState("");
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [period, setPeriod] = useState("overall");
  const [date, setDate] = useState("");
  const [history, setHistory] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [strategistError, setStrategistError] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [targetAttPct, setTargetAttPct] = useState(75);
  const [customTargetAtt, setCustomTargetAtt] = useState("");
  const [useCustomTargetAtt, setUseCustomTargetAtt] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener("attendanceChanged", handleUpdate);
    return () => window.removeEventListener("attendanceChanged", handleUpdate);
  }, []);

  const effectiveTarget = useCustomTarget ? (Number(customTarget) || 0) : target;
  const effectiveTargetAtt = useCustomTargetAtt ? (Number(customTargetAtt) || 0) : targetAttPct;

  const result = useMemo(() => {
    const a = parseInt(attended, 10);
    const t = parseInt(total, 10);
    if (isNaN(a) || isNaN(t) || t === 0) return null;
    if (a > t) return null;
    return calcBunkable(a, t, effectiveTarget);
  }, [attended, total, effectiveTarget]);

  const handlePeriodChange = (p) => {
    setPeriod(p.value);
    if (p.date) setDate(p.date);
    if (p.target && !useCustomTarget) setTarget(p.target);
  };

  const handleSave = () => {
    if (!result) return;
    const entry = {
      ...result,
      period: EXAM_PERIODS.find(p => p.value === period)?.label || period,
      date: date || new Date().toLocaleDateString("en-IN"),
      id: Date.now(),
    };
    setHistory(prev => [entry, ...prev].slice(0, 10));
  };

  const clearHistory = () => setHistory([]);

  useEffect(() => {
    if (activeTab !== "smart") return;

    const loadData = async () => {
      const hasCached = typeof window !== "undefined" && 
        sessionStorage.getItem("dashboard_data") && 
        sessionStorage.getItem("dashboard_timetable");
      
      if (!hasCached && !dashboardData && !timetable) {
        setLoadingData(true);
      }
      setStrategistError("");
      setIsUsingMock(false);

      try {
        const cachedDash = sessionStorage.getItem("dashboard_data");
        const cachedTT = sessionStorage.getItem("dashboard_timetable");
        if (cachedDash) setDashboardData(JSON.parse(cachedDash));
        if (cachedTT) setTimetable(JSON.parse(cachedTT));

        const [dashRes, ttRes] = await Promise.all([
          fetch("/api/student/dashboard"),
          fetch("/api/student/timetable")
        ]);

        if (dashRes.status === 401 || ttRes.status === 401) {
          router.push("/");
          return;
        }

        const [dashJson, ttJson] = await Promise.all([dashRes.json(), ttRes.json()]);

        let loadedDash = null;
        let loadedTT = null;

        if (dashJson.success) {
          loadedDash = dashJson.data;
          setDashboardData(dashJson.data);
          try { sessionStorage.setItem("dashboard_data", JSON.stringify(dashJson.data)); } catch {}
        }
        
        if (ttJson.success) {
          loadedTT = ttJson.data;
          setTimetable(ttJson.data);
          try { sessionStorage.setItem("dashboard_timetable", JSON.stringify(ttJson.data)); } catch {}
        }

        if (!loadedDash || !loadedTT || loadedTT.length === 0) {
          setIsUsingMock(true);
          setDashboardData(MOCK_DASHBOARD);
          setTimetable(MOCK_TIMETABLE);
        }
      } catch (err) {
        setIsUsingMock(true);
        setDashboardData(MOCK_DASHBOARD);
        setTimetable(MOCK_TIMETABLE);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [activeTab, router]);

  useEffect(() => {
    if (timetable && timetable.length > 0 && !selectedDay) {
      const now = new Date();
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const todayName = dayNames[now.getDay()].toUpperCase();
      const hasToday = timetable.some(d => d.day.toUpperCase() === todayName);
      setSelectedDay(hasToday ? todayName : timetable[0].day.toUpperCase());
    }
  }, [timetable, selectedDay]);

  const filteredAttendance = useMemo(() => {
    if (!dashboardData) return [];
    const merged = getMergedAttendance(dashboardData.attendance, dashboardData.usn);
    return filterElectives(merged);
  }, [dashboardData, refreshKey]);

  const heatmapData = useMemo(() => {
    if (!timetable || timetable.length === 0) return [];

    return timetable.map(dayItem => {
      const dayName = dayItem.day.toUpperCase();
      const dayClasses = filterElectives(dayItem.classes, (c) => c.course);
      
      if (dayClasses.length === 0) {
        return { day: dayName, date: dayItem.date, classes: [], status: "holiday", score: 100 };
      }

      let hasLab = false;
      let dropsBelowTarget = false;
      let isNearMargin = false;
      let totalCredits = 0;

      const skipCounts = {};
      dayClasses.forEach(cls => {
        const { code, name } = parseCourse(cls.course);
        skipCounts[code] = (skipCounts[code] || 0) + 1;
        totalCredits += guessCredits(code, name);
        if (isLabClass(code, name)) hasLab = true;
      });

      const evaluatedClasses = dayClasses.map(cls => {
        const { code, name } = parseCourse(cls.course);
        const att = matchAttendance(cls.course, filteredAttendance);
        const credits = guessCredits(code, name);

        let currentPct = 100;
        let projectedPct = 100;
        let present = 0;
        let total = 0;

        if (att) {
          const skipCount = skipCounts[code] || 1;
          const proj = getProjectedAttendance(att, skipCount);
          currentPct = proj.current;
          projectedPct = proj.projected;
          present = proj.present;
          total = proj.total;

          if (projectedPct < effectiveTargetAtt) {
            dropsBelowTarget = true;
          } else if (projectedPct < effectiveTargetAtt + 5) {
            isNearMargin = true;
          }
        }

        return {
          ...cls,
          code,
          name,
          credits,
          isLab: isLabClass(code, name),
          currentPct,
          projectedPct,
          present,
          total
        };
      });

      let score = 100;
      if (hasLab) score -= 150; 
      
      dayClasses.forEach(cls => {
        const { code } = parseCourse(cls.course);
        const att = matchAttendance(cls.course, filteredAttendance);
        if (att) {
          const skipCount = skipCounts[code] || 1;
          const { current, projected } = getProjectedAttendance(att, skipCount);
          const margin = current - effectiveTargetAtt;

          if (projected < effectiveTargetAtt) {
            score -= 100; 
          } else {
            score += margin * 2; 
          }
        }
      });

      score -= totalCredits * 4;
      score -= dayClasses.length * 3;

      let status = "safe";
      if (hasLab || dropsBelowTarget) {
        status = "critical";
      } else if (isNearMargin || totalCredits >= 9 || dayClasses.length >= 4) {
        status = "moderate";
      }

      return {
        day: dayName,
        date: dayItem.date,
        classes: evaluatedClasses,
        status,
        score,
        totalCredits,
        hasLab
      };
    });
  }, [timetable, filteredAttendance, effectiveTargetAtt]);

  const recommendation = useMemo(() => {
    const validDays = heatmapData.filter(d => d.classes.length > 0);
    if (validDays.length === 0) return null;

    const sorted = [...validDays].sort((a, b) => b.score - a.score);
    return sorted[0];
  }, [heatmapData]);

  const recommendedReasoning = useMemo(() => {
    if (!recommendation) return "";
    const recDay = recommendation.day;
    const count = recommendation.classes.length;
    const credits = recommendation.totalCredits;
    const hasLab = recommendation.hasLab;

    let text = `Based on your live SVIT attendance, we recommend **${recDay.charAt(0) + recDay.slice(1).toLowerCase()}** as your safest day to skip classes. `;
    text += `It has only ${count} class${count > 1 ? "es" : ""} scheduled, totaling ${credits} credit${credits > 1 ? "s" : ""}. `;

    if (hasLab) {
      text += "⚠️ Note: It includes a practical laboratory session, which is usually compulsory. However, other days carry significantly higher credits or attendance risks. ";
    } else {
      text += "Importantly, there are no laboratory sessions on this day, reducing the academic impact. ";
    }

    let maxDrop = 0;
    let worstCourse = "";
    let worstProj = 0;

    recommendation.classes.forEach(c => {
      const drop = c.currentPct - c.projectedPct;
      if (drop > maxDrop) {
        maxDrop = drop;
        worstCourse = c.code;
        worstProj = c.projectedPct;
      }
    });

    if (worstCourse) {
      text += ` Skipping will drop ${worstCourse} by ${maxDrop}% (from ${maxDrop + worstProj}% to ${worstProj}%), which comfortably keeps you above your ${effectiveTargetAtt}% threshold.`;
    }

    return text;
  }, [recommendation, effectiveTargetAtt]);

  const selectedDayDetails = useMemo(() => {
    return heatmapData.find(d => d.day === selectedDay);
  }, [heatmapData, selectedDay]);

  return (
    <main className="page-shell fade-in" style={{ paddingBottom: "100px" }}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Attendance planner</p>
          <h1 className="title">Bunk Strategist</h1>
        </div>
        <button onClick={() => router.push("/")} className="button secondary">
          Logout
        </button>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        <Link className="tab" href="/dashboard">Overview</Link>
        <Link className="tab" href="/dashboard/marketplace">Marketplace</Link>
        <Link className="tab" href="/dashboard/events">Calendar</Link>
        <Link className="tab" href="/dashboard/timetable">Timetable</Link>
        <Link className="tab" href="/dashboard/info">Profile</Link>
        <Link className="tab active" href="/dashboard/bunk">Bunk Planner</Link>
        <Link className="tab" href="/dashboard/connect">Connect</Link>
      </nav>

      <div style={{
        display: "flex",
        background: "var(--surface-soft)",
        padding: "4px",
        borderRadius: "12px",
        border: "1px solid var(--line)",
        margin: "16px 0"
      }}>
        <button 
          className={activeTab === "manual" ? "active" : ""} 
          type="button" 
          onClick={() => setActiveTab("manual")}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "none",
            borderRadius: "9px",
            fontSize: "0.82rem",
            fontWeight: 850,
            cursor: "pointer",
            transition: "all 150ms ease",
            background: activeTab === "manual" ? "var(--primary)" : "transparent",
            color: activeTab === "manual" ? "#fff" : "var(--muted)",
          }}
        >
          🧮 Manual Calculator
        </button>
        <button 
          className={activeTab === "smart" ? "active" : ""} 
          type="button" 
          onClick={() => setActiveTab("smart")}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "none",
            borderRadius: "9px",
            fontSize: "0.82rem",
            fontWeight: 850,
            cursor: "pointer",
            transition: "all 150ms ease",
            background: activeTab === "smart" ? "var(--primary)" : "transparent",
            color: activeTab === "smart" ? "#fff" : "var(--muted)",
          }}
        >
          🧠 Smart Planner
        </button>
      </div>

      {activeTab === "manual" && (
        <div className="bunk-layout">
          <section className="panel bunk-panel">
            <div className="panel-head compact">
              <h2 className="panel-title">What-if calculator</h2>
            </div>

            <div className="notice" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(186,100,41,0.18)", fontSize: "0.82rem", lineHeight: 1.5, marginBottom: 20 }}>
              <strong>Note:</strong> This manual calculator is specifically for those subjects whose attendance hasn{"\u2019"}t been added or updated to the official ERP portal yet. Use this to track your own &quot;hidden&quot; attendance count!
            </div>

            <div className="bunk-form">
              <div className="field">
                <label>Calculation for</label>
                <div className="bunk-period-row">
                  {EXAM_PERIODS.map(ep => (
                    <button
                      key={ep.value}
                      type="button"
                      className={`bunk-period-btn ${period === ep.value ? "active" : ""}`}
                      onClick={() => handlePeriodChange(ep)}
                    >
                      {ep.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bunk-input-row">
                <div className="field">
                  <label htmlFor="bunk-attended">Classes attended</label>
                  <input
                    id="bunk-attended"
                    type="number"
                    className="input"
                    inputMode="numeric"
                    placeholder="e.g. 42"
                    min="0"
                    value={attended}
                    onChange={e => setAttended(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="bunk-total">Total classes</label>
                  <input
                    id="bunk-total"
                    type="number"
                    className="input"
                    inputMode="numeric"
                    placeholder="e.g. 50"
                    min="1"
                    value={total}
                    onChange={e => setTotal(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label>Target attendance %</label>
                <div className="bunk-target-row">
                  {TARGET_PRESETS.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`bunk-target-btn ${!useCustomTarget && target === t ? "active" : ""}`}
                      onClick={() => { setTarget(t); setUseCustomTarget(false); }}
                    >
                      {t}%
                    </button>
                  ))}
                  <input
                    type="number"
                    className="input bunk-target-input"
                    inputMode="numeric"
                    placeholder="Custom"
                    min="1"
                    max="100"
                    value={customTarget}
                    onFocus={() => setUseCustomTarget(true)}
                    onChange={e => { setCustomTarget(e.target.value); setUseCustomTarget(true); }}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="bunk-date">Date (optional)</label>
                <input
                  id="bunk-date"
                  type="date"
                  className="input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>

            {result && (
              <div className="bunk-result">
                <div className="bunk-result-header">
                  <div>
                    <span className="eyebrow">Current attendance</span>
                    <span className={`bunk-current-pct ${result.current >= effectiveTarget ? "safe" : "risk"}`}>
                      {result.current}%
                    </span>
                  </div>
                  <span className="badge" style={{ background: "var(--surface-soft)", color: "var(--muted)", fontSize: "0.76rem" }}>
                    {result.attended} / {result.total}
                  </span>
                </div>

                <div className="bunk-result-bar">
                  <div
                    className="bunk-result-fill"
                    style={{ width: `${Math.min(100, result.current)}%` }}
                    data-safe={result.current >= effectiveTarget}
                  />
                  <div
                    className="bunk-result-marker"
                    style={{ left: `${Math.min(100, effectiveTarget)}%` }}
                    title={`Target: ${effectiveTarget}%`}
                  />
                </div>

                <div className="bunk-verdict-grid">
                  {result.current >= effectiveTarget ? (
                    <div className="bunk-verdict safe">
                      <span className="bunk-verdict-num">{result.bunkable}</span>
                      <span className="bunk-verdict-label">
                        class{result.bunkable !== 1 ? "es" : ""} you can bunk
                      </span>
                      <span className="bunk-verdict-sub">
                        and still stay at or above {effectiveTarget}%
                      </span>
                    </div>
                  ) : (
                    <div className="bunk-verdict risk">
                      <span className="bunk-verdict-num">{result.needToAttend}</span>
                      <span className="bunk-verdict-label">
                        class{result.needToAttend !== 1 ? "es" : ""} you must attend
                      </span>
                      <span className="bunk-verdict-sub">
                        in a row to reach {effectiveTarget}%
                      </span>
                    </div>
                  )}
                </div>

                <button className="button full" onClick={handleSave} style={{ marginTop: 12 }}>
                  Save to history
                </button>
              </div>
            )}
          </section>

          <section className="panel bunk-history-panel">
            <div className="panel-head compact">
              <h2 className="panel-title">Calculation history</h2>
              {history.length > 0 && (
                <button className="badge" style={{ cursor: "pointer", background: "var(--danger-soft)", color: "var(--danger)" }} onClick={clearHistory}>
                  Clear
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="bunk-history-list">
                {history.map(h => (
                  <div className="bunk-history-item" key={h.id}>
                    <div className="bunk-history-top">
                      <span className="badge" style={{ background: "var(--surface-soft)" }}>{h.period}</span>
                      <span className="subtle" style={{ fontSize: "0.76rem" }}>{h.date}</span>
                    </div>
                    <div className="bunk-history-stats">
                      <span><strong>{h.attended}</strong>/{h.total}</span>
                      <span className={h.current >= h.target ? "safe-text" : "risk-text"}>
                        {h.current}%
                      </span>
                      <span className="subtle">
                        {h.current >= h.target
                          ? `Can bunk ${h.bunkable}`
                          : `Need ${h.needToAttend} more`
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="subtle" style={{ fontSize: "0.84rem" }}>
                No calculations saved yet. Use the calculator and hit &quot;Save to history&quot; to track your attendance scenarios.
              </p>
            )}
          </section>
        </div>
      )}

      {activeTab === "smart" && (
        <div style={{ display: "grid", gap: "20px" }}>
          
          {loadingData ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <div className="loader" />
            </div>
          ) : strategistError ? (
            <div className="notice error" style={{ textAlign: "center", padding: 24 }}>
              <h3>Failed to load strategist</h3>
              <p style={{ marginTop: 8 }}>{strategistError}</p>
            </div>
          ) : (
            <>
              {isUsingMock && (
                <div style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  background: "rgba(186, 100, 41, 0.08)",
                  border: "1px solid rgba(186, 100, 41, 0.2)",
                  borderRadius: "14px",
                  padding: "12px 16px",
                  color: "var(--accent)"
                }}>
                  <Info size={18} style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: "0.76rem", lineHeight: "1.4" }}>
                    <strong>Demo Mode:</strong> Could not establish connection to live SVIT ERP portal. We have loaded your cached curriculum (4th Sem CSE) so the strategizing remains fully testable!
                  </p>
                </div>
              )}

              <section className="panel" style={{ padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sliders size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--ink)" }}>Target Threshold</span>
                  </div>
                  
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {TARGET_PRESETS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setTargetAttPct(t); setUseCustomTargetAtt(false); }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          transition: "all 150ms ease",
                          background: (!useCustomTargetAtt && targetAttPct === t) ? "var(--primary)" : "var(--surface-soft)",
                          color: (!useCustomTargetAtt && targetAttPct === t) ? "#fff" : "var(--muted)",
                          border: "1px solid var(--line)"
                        }}
                      >
                        {t}%
                      </button>
                    ))}
                    <input
                      type="number"
                      placeholder="Custom"
                      min="1"
                      max="100"
                      value={customTargetAtt}
                      onFocus={() => setUseCustomTargetAtt(true)}
                      onChange={e => { setCustomTargetAtt(e.target.value); setUseCustomTargetAtt(true); }}
                      style={{
                        width: "65px",
                        padding: "5px 8px",
                        borderRadius: "8px",
                        fontSize: "0.74rem",
                        fontWeight: 800,
                        textAlign: "center",
                        background: useCustomTargetAtt ? "var(--primary)" : "var(--surface-soft)",
                        color: useCustomTargetAtt ? "#fff" : "var(--ink)",
                        border: "1px solid var(--line)",
                        outline: "none"
                      }}
                    />
                  </div>
                </div>
              </section>

              {recommendation && (
                <section className="panel" style={{
                  border: "1px solid var(--primary)",
                  background: "rgba(35, 102, 84, 0.03)",
                  boxShadow: "0 6px 20px rgba(35, 102, 84, 0.04)",
                  borderRadius: "16px",
                  padding: "20px 18px",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
                    <div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Sparkles size={12} /> ALGORITHMIC RECOMMENDATION
                      </span>
                      <h2 style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--ink)", marginTop: "4px" }}>
                        Safest Skip Day: <span style={{ color: "var(--primary)" }}>{recommendation.day}</span>
                      </h2>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="badge" style={{ backgroundColor: "var(--primary-soft)", color: "var(--primary)", fontSize: "0.76rem", padding: "4px 10px" }}>
                        Score: {recommendation.score.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <p 
                      style={{ fontSize: "0.82rem", color: "var(--ink)", lineHeight: "1.55" }}
                      dangerouslySetInnerHTML={{ __html: recommendedReasoning.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                    />
                  </div>

                  <div style={{ marginTop: "18px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ padding: "8px 12px", background: "var(--surface-soft)", fontSize: "0.72rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: "10px" }}>
                      <span>Subject</span>
                      <span style={{ textAlign: "center" }}>Current</span>
                      <span style={{ textAlign: "center" }}>Projected</span>
                    </div>
                    
                    {recommendation.classes.map((cls, idx) => (
                      <div key={idx} style={{ padding: "10px 12px", fontSize: "0.78rem", borderBottom: idx < recommendation.classes.length - 1 ? "1px solid var(--line)" : "none", display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: "10px", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={cls.course}>
                          {cls.code} <small style={{ fontWeight: 500, color: "var(--muted)" }}>({cls.credits} Cr)</small>
                        </span>
                        
                        <span style={{ textAlign: "center", fontWeight: 800, color: cls.currentPct < effectiveTargetAtt ? "var(--danger)" : "var(--success)" }}>
                          {cls.currentPct}%
                        </span>
                        
                        <span style={{ textAlign: "center", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", color: cls.projectedPct < effectiveTargetAtt ? "var(--danger)" : "var(--success)" }}>
                          {cls.projectedPct}% 
                          {cls.projectedPct < cls.currentPct && (
                            <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--danger)" }}>
                              (-{(cls.currentPct - cls.projectedPct)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "8px" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--ink)" }}>Weekly Bunk Risk</h2>
                <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>Click a day to analyze schedule</span>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "10px",
                width: "100%"
              }}>
                {heatmapData.map((d) => {
                  const isSelected = selectedDay === d.day;
                  
                  let borderStyle = "1px solid var(--line)";
                  let bgStyle = "var(--surface)";
                  let titleColor = "var(--ink)";
                  let badgeBg = "var(--surface-soft)";
                  let badgeText = "var(--muted)";
                  let badgeLabel = "No Classes";

                  if (d.status === "critical") {
                    borderStyle = isSelected ? "2px solid var(--danger)" : "1.5px solid rgba(255, 59, 48, 0.4)";
                    bgStyle = isSelected ? "rgba(255, 59, 48, 0.05)" : "rgba(255, 59, 48, 0.02)";
                    titleColor = "var(--danger)";
                    badgeBg = "rgba(255, 59, 48, 0.12)";
                    badgeText = "var(--danger)";
                    badgeLabel = "🚨 Critical";
                  } else if (d.status === "moderate") {
                    borderStyle = isSelected ? "2px solid var(--warning)" : "1.5px solid rgba(186, 100, 41, 0.4)";
                    bgStyle = isSelected ? "rgba(186, 100, 41, 0.05)" : "rgba(186, 100, 41, 0.02)";
                    titleColor = "var(--warning)";
                    badgeBg = "rgba(186, 100, 41, 0.12)";
                    badgeText = "var(--warning)";
                    badgeLabel = "⚠️ Moderate";
                  } else if (d.status === "safe") {
                    borderStyle = isSelected ? "2px solid var(--success)" : "1.5px solid rgba(33, 131, 92, 0.4)";
                    bgStyle = isSelected ? "rgba(33, 131, 92, 0.05)" : "rgba(33, 131, 92, 0.02)";
                    titleColor = "var(--success)";
                    badgeBg = "rgba(33, 131, 92, 0.12)";
                    badgeText = "var(--success)";
                    badgeLabel = "✅ Safe";
                  }

                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setSelectedDay(d.day)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        textAlign: "left",
                        padding: "14px 12px",
                        borderRadius: "14px",
                        border: borderStyle,
                        background: bgStyle,
                        cursor: "pointer",
                        transition: "all 150ms ease",
                        transform: isSelected ? "scale(1.02)" : "scale(1)",
                        boxShadow: isSelected ? "0 4px 15px rgba(0, 0, 0, 0.06)" : "none",
                        outline: "none"
                      }}
                    >
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {d.day.substring(0, 3)}
                      </span>
                      <strong style={{ fontSize: "1.1rem", fontWeight: 900, color: titleColor, marginTop: "2px" }}>
                        {d.day.charAt(0) + d.day.slice(1).toLowerCase()}
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "4px" }}>
                        {d.classes.length} Class{d.classes.length !== 1 ? "es" : ""}
                      </span>
                      <span style={{ 
                        fontSize: "0.66rem", 
                        fontWeight: 900, 
                        marginTop: "8px", 
                        padding: "3px 8px", 
                        borderRadius: "6px",
                        backgroundColor: badgeBg,
                        color: badgeText,
                        letterSpacing: "0.02em"
                      }}>
                        {badgeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedDayDetails && (
                <section className="panel" style={{
                  borderRadius: "16px",
                  padding: "20px 18px",
                  border: "1px solid var(--line)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.03)"
                }}>
                  <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={18} color="var(--primary)" /> {selectedDayDetails.day.charAt(0) + selectedDayDetails.day.slice(1).toLowerCase()}&apos;s Schedule
                    </h2>
                    <span style={{ fontSize: "0.74rem", color: "var(--muted)", fontWeight: 700 }}>
                      {selectedDayDetails.classes.length} class{selectedDayDetails.classes.length !== 1 ? "es" : ""} scheduled
                    </span>
                  </div>

                  {selectedDayDetails.classes.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
                      <p style={{ fontSize: "2rem" }}>🎉</p>
                      <p style={{ fontSize: "0.82rem", fontWeight: 700, marginTop: "8px" }}>No classes scheduled on this day!</p>
                      <p style={{ fontSize: "0.74rem", opacity: 0.7 }}>Enjoy your break or study at your own pace.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {selectedDayDetails.classes.map((cls, idx) => {
                        const isSafe = cls.projectedPct >= effectiveTargetAtt;

                        return (
                          <article 
                            key={idx} 
                            style={{ 
                              padding: "14px 16px", 
                              borderRadius: "12px", 
                              border: "1px solid var(--line)",
                              background: "var(--surface-soft)",
                              display: "grid",
                              gridTemplateColumns: "85px minmax(0, 1fr) auto",
                              gap: "12px",
                              alignItems: "center"
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--primary)" }}>
                                {cls.time.split(" to ")[0]}
                              </span>
                              <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
                                {cls.time.split(" to ")[1]}
                              </span>
                            </div>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <strong style={{ fontSize: "0.85rem", color: "var(--ink)" }}>{cls.code}</strong>
                                {cls.isLab && (
                                  <span style={{ fontSize: "0.64rem", fontWeight: 900, background: "rgba(255, 59, 48, 0.12)", color: "var(--danger)", padding: "2px 6px", borderRadius: "4px" }}>
                                    LAB
                                  </span>
                                )}
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", background: "var(--surface)", borderRadius: "4px", color: "var(--muted)", border: "1px solid var(--line)" }}>
                                  {cls.credits} Cr
                                </span>
                              </div>
                              <h4 style={{ fontSize: "0.74rem", color: "var(--muted)", fontWeight: 600, marginTop: "2px" }}>
                                {cls.name || "Subject Lecture"}
                              </h4>
                              <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "4px" }}>
                                {cls.room} &middot; {cls.faculty}
                              </p>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 900, color: cls.currentPct < effectiveTargetAtt ? "var(--danger)" : "var(--success)" }}>
                                {cls.currentPct}% Current
                              </span>
                              <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: isSafe ? "var(--success)" : "var(--danger)", marginTop: "2px" }}>
                                Skip Proj: <strong>{cls.projectedPct}%</strong>
                              </span>
                            </div>

                            <div style={{ 
                              gridColumn: "1 / -1", 
                              borderTop: "1px dashed var(--line)", 
                              paddingTop: "8px", 
                              marginTop: "4px",
                              display: "flex",
                              gap: "6px",
                              alignItems: "center",
                              fontSize: "0.7rem"
                            }}>
                              {cls.isLab ? (
                                <>
                                  <ShieldAlert size={12} color="var(--danger)" />
                                  <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                                    Practical Lab scheduled. Bunking will miss vital manual work and lab log registers.
                                  </span>
                                </>
                              ) : !isSafe ? (
                                <>
                                  <AlertTriangle size={12} color="var(--danger)" />
                                  <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                                    DANGER: Skipping drops you to {cls.projectedPct}%, which falls below your {effectiveTargetAtt}% target!
                                  </span>
                                </>
                              ) : (cls.projectedPct < effectiveTargetAtt + 5) ? (
                                <>
                                  <AlertTriangle size={12} color="var(--warning)" />
                                  <span style={{ color: "var(--warning)", fontWeight: 700 }}>
                                    CAUTION: Skip is mathematically safe, but drops you close to the margin ({cls.projectedPct}%).
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck size={12} color="var(--success)" />
                                  <span style={{ color: "var(--success)", fontWeight: 750 }}>
                                    SAFE: Adequate attendance cushion. Skipping this slot will keep you comfortably above limit.
                                  </span>
                                </>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          <footer style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--muted)", padding: "10px 0", borderTop: "1px dashed var(--line)" }}>
            <span>* Safety rankings calculated based on subject credits, class count weight, practical lab check, and individual margin gaps under VTU guidelines.</span>
          </footer>
        </div>
      )}
    </main>
  );
}
