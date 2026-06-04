"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders,
  EyeOff,
  Award,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { apiFetch, filterElectives } from "@/lib/clientApi";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatMark = (mark) => {
  if (!mark || mark.obtained === null) return "-";
  if (mark.max !== null) return `${mark.obtained}/${mark.max}`;
  return `${mark.obtained}`;
};

const hasMark = (mark) => mark?.obtained !== null && mark?.obtained !== undefined;

const getActivityMarks = (breakdown) => {
  const first = hasMark(breakdown?.assign1)
    ? { label: "Assign 1", mark: breakdown.assign1 }
    : { label: "Lab 1", mark: breakdown?.lab1 };
  const second = hasMark(breakdown?.assign2)
    ? { label: "Assign 2", mark: breakdown.assign2 }
    : { label: "Lab 2", mark: breakdown?.lab2 };

  return [first, second];
};

const getPrimaryMark = (item) => {
  const finalIA = item?.breakdown?.finalIA;
  if (hasMark(finalIA)) return finalIA;
  if (item?.marks !== null && item?.marks !== undefined) {
    return { obtained: toNumber(item.marks), max: item.maxMarks ?? null };
  }
  return { obtained: null, max: null };
};

// Guess course credits from VTU code or course name
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

// Calculate grade letter and points under VTU norms
const getGradeDetails = (cie, see) => {
  const cieVal = Number(cie || 0);
  const seeVal = Number(see || 0);
  const scaledSee = Math.round(seeVal / 2);
  const total = Math.min(100, Math.round(cieVal + scaledSee));

  if (cieVal < 20) {
    return {
      total,
      grade: "F",
      point: 0,
      isPass: false,
      reason: "CIE < 20",
    };
  }
  if (seeVal < 35) {
    return {
      total,
      grade: "F",
      point: 0,
      isPass: false,
      reason: "SEE < 35",
    };
  }
  if (total < 40) {
    return {
      total,
      grade: "F",
      point: 0,
      isPass: false,
      reason: "Total < 40",
    };
  }

  if (total >= 90) return { total, grade: "O", point: 10, isPass: true };
  if (total >= 80) return { total, grade: "A+", point: 9, isPass: true };
  if (total >= 70) return { total, grade: "A", point: 8, isPass: true };
  if (total >= 60) return { total, grade: "B+", point: 7, isPass: true };
  if (total >= 55) return { total, grade: "B", point: 6, isPass: true };
  if (total >= 50) return { total, grade: "C", point: 5, isPass: true };
  return { total, grade: "P", point: 4, isPass: true };
};

// Solves for target SGPA
const solveTargetSgpa = (targetVal, courses, creditsMap, customCieMap = {}) => {
  const target = parseFloat(targetVal);
  if (isNaN(target) || target < 4.0 || target > 10.0) return null;

  const getCie = (c) => customCieMap[c.course] !== undefined ? customCieMap[c.course] : toNumber(getPrimaryMark(c).obtained);

  const validCourses = courses.filter(c => getCie(c) >= 20);
  const totalCredits = courses.reduce((sum, c) => sum + (creditsMap[c.course] || guessCredits(c.course, c.courseName)), 0);
  if (totalCredits === 0) return null;

  const projected = {};
  courses.forEach(c => {
    const cie = getCie(c);
    if (cie < 20) {
      projected[c.course] = 0;
    } else {
      projected[c.course] = Math.max(35, (40 - cie) * 2);
    }
  });

  const getSgpa = (proj) => {
    let weightedSum = 0;
    courses.forEach(c => {
      const cie = getCie(c);
      const credits = creditsMap[c.course] || guessCredits(c.course, c.courseName);
      const see = proj[c.course];
      const { point } = getGradeDetails(cie, see);
      weightedSum += credits * point;
    });
    return weightedSum / totalCredits;
  };

  const maxProj = {};
  courses.forEach(c => {
    const cie = getCie(c);
    maxProj[c.course] = cie < 20 ? 0 : 100;
  });
  const maxSgpa = getSgpa(maxProj);
  if (target > maxSgpa) {
    return { projected: maxProj, error: `Max SGPA is ${maxSgpa.toFixed(2)}` };
  }

  const currentProj = { ...projected };
  const gradeThresh = [40, 50, 55, 60, 70, 80, 90];

  let iterations = 0;
  while (getSgpa(currentProj) < target && iterations < 150) {
    iterations++;
    let bestCourse = null;
    let minGP = 11;

    for (const c of validCourses) {
      const cie = getCie(c);
      const see = currentProj[c.course];
      const { point } = getGradeDetails(cie, see);

      if (point < 10 && point < minGP) {
        const currentTotal = cie + see / 2;
        const nextThresh = gradeThresh.find(t => t > currentTotal);
        if (nextThresh) {
          const neededSEE = (nextThresh - cie) * 2;
          if (neededSEE <= 100) {
            minGP = point;
            bestCourse = c;
          }
        }
      }
    }

    if (!bestCourse) break;

    const cie = getCie(bestCourse);
    const see = currentProj[bestCourse.course];
    const currentTotal = cie + see / 2;
    const nextThresh = gradeThresh.find(t => t > currentTotal);
    currentProj[bestCourse.course] = Math.min(100, Math.max(35, (nextThresh - cie) * 2));
  }

  return { projected: currentProj, maxSgpa };
};

export default function ResultsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(0);
  const [semester, setSemester] = useState("current");
  const [activeTab, setActiveTab] = useState("isa");

  const [projectedMarks, setProjectedMarks] = useState({});
  const [courseCredits, setCourseCredits] = useState({});
  const [customCie, setCustomCie] = useState({});
  const [targetSgpa, setTargetSgpa] = useState("");
  const [solverResult, setSolverResult] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);


  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let alive = true;
    const fetchProfile = async () => {
      try {
        const cached = sessionStorage.getItem("profile_data");
        if (cached) {
          const prof = JSON.parse(cached);
          if (alive) setProfile(prof);
          return;
        }
        const res = await fetch("/api/student/profile");
        if (res.status === 401) return;
        const json = await res.json();
        if (json.success && alive) {
          setProfile(json.data);
          try { sessionStorage.setItem("profile_data", JSON.stringify(json.data)); } catch { }
        }
      } catch (err) {
        console.error("Failed fetching profile", err);
      }
    };
    fetchProfile();
    return () => { alive = false; };
  }, []);





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
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    });

    apiFetch("/api/student/dashboard")
      .then((json) => {
        if (!alive) return;
        setData(json.data);
        try { sessionStorage.setItem("dashboard_data", JSON.stringify(json.data)); } catch { }
      })
      .catch((err) => alive && setError(err.message || "Could not load results."))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, []);

  const cie = useMemo(() => filterElectives(data?.cie || []), [data]);

  useEffect(() => {
    if (cie.length > 0) {
      const initialMarks = {};
      const initialCredits = {};
      const initialCie = {};
      cie.forEach(c => {
        initialMarks[c.course] = 60;
        initialCredits[c.course] = guessCredits(c.course, c.courseName);
        initialCie[c.course] = toNumber(getPrimaryMark(c).obtained, 0);
      });
      queueMicrotask(() => {
        setProjectedMarks(prev => ({ ...initialMarks, ...prev }));
        setCourseCredits(prev => ({ ...initialCredits, ...prev }));
        setCustomCie(prev => ({ ...initialCie, ...prev }));
      });
    }
  }, [cie]);

  const { currentSgpa, failedCount, totalCredits } = useMemo(() => {
    let weightedSum = 0;
    let totalCreds = 0;
    let fails = 0;

    cie.forEach(c => {
      const cieVal = customCie[c.course] ?? toNumber(getPrimaryMark(c).obtained);
      const seeVal = projectedMarks[c.course] ?? 60;
      const credits = courseCredits[c.course] ?? guessCredits(c.course, c.courseName);
      const { point, isPass } = getGradeDetails(cieVal, seeVal);

      weightedSum += credits * point;
      totalCreds += credits;
      if (!isPass) fails++;
    });

    return {
      currentSgpa: totalCreds > 0 ? (weightedSum / totalCreds) : 0,
      failedCount: fails,
      totalCredits: totalCreds,
    };
  }, [cie, projectedMarks, courseCredits, customCie]);

  const handleSliderChange = (courseCode, val) => {
    setProjectedMarks(prev => ({
      ...prev,
      [courseCode]: Number(val)
    }));
    setSolverResult(null);
  };

  const handleCieSliderChange = (courseCode, val) => {
    setCustomCie(prev => ({
      ...prev,
      [courseCode]: Number(val)
    }));
    setSolverResult(null);
  };

  const handleCreditChange = (courseCode, val) => {
    setCourseCredits(prev => ({
      ...prev,
      [courseCode]: Number(val)
    }));
  };

  const handleTargetChange = (val) => {
    setTargetSgpa(val);
    if (!val || isNaN(Number(val))) return;

    const res = solveTargetSgpa(val, cie, courseCredits, customCie);
    if (res) {
      setProjectedMarks(res.projected);
      if (res.error) {
        setSolverResult({ success: false, message: res.error });
      } else {
        setSolverResult({ success: true, message: `Solved for ${Number(val).toFixed(2)} SGPA` });
      }
    }
  };

  const applyPreset = (targetVal) => {
    handleTargetChange(targetVal.toString());
  };

  const getGradeColorStyle = (grade) => {
    switch (grade) {
      case "O": return { background: "var(--success)", color: "#fff" };
      case "A+": case "A": return { background: "rgba(33,131,92,0.88)", color: "#fff" };
      case "B+": case "B": return { background: "var(--primary)", color: "#fff" };
      case "C": return { background: "var(--warning)", color: "#fff" };
      case "P": return { background: "var(--accent)", color: "#fff" };
      case "F": default: return { background: "var(--danger)", color: "#fff" };
    }
  };

  const userCieAverage = useMemo(() => {
    if (!cie || cie.length === 0) return 0;
    let sum = 0;
    let count = 0;
    cie.forEach(c => {
      const mark = getPrimaryMark(c);
      if (mark && mark.obtained !== null) {
        const maxVal = mark.max || 50;
        const obtainedVal = toNumber(mark.obtained);
        const normalized = maxVal === 50 ? obtainedVal : (obtainedVal / maxVal) * 50;
        sum += normalized;
        count++;
      }
    });
    return count > 0 ? Number((sum / count).toFixed(2)) : 0;
  }, [cie]);





  if (loading) return <div className="center-state"><div className="loader" /></div>;
  if (error) return <div className="center-state"><div className="notice error">{error}</div></div>;

  return (
    <main className="page-shell fade-in native-screen" style={{ paddingBottom: "100px" }}>
      <section className="native-page-head">
        <div>
          <h1>Results</h1>
          <p>{activeTab === "isa" ? "Provisional CIE" : "VTU SEE Predictor"}</p>
        </div>
      </section>

      {/* Tabs */}
      <div className="native-segment" style={{ marginBottom: "20px" }}>
        <button 
          className={activeTab === "isa" ? "active" : ""} 
          type="button" 
          onClick={() => setActiveTab("isa")}
        >
          ISA (Internals)
        </button>
        <button 
          className={activeTab === "esa" ? "active" : ""} 
          type="button" 
          onClick={() => setActiveTab("esa")}
        >
          ESA (Predictor)
        </button>

      </div>

      {activeTab === "isa" && (
        <>
          <div className="native-chip-row">
            <button className={semester === "current" ? "active" : ""} type="button" onClick={() => setSemester("current")}>
              Sem-{data?.semester || "Current"}
            </button>
            <button className={semester === "previous" ? "active" : ""} type="button" onClick={() => setSemester("previous")}>
              Previous
            </button>
          </div>

          <section className="native-list">
            {cie.length ? cie.map((item, index) => {
              const primaryMark = getPrimaryMark(item);
              const bd = item.breakdown;
              const isOpen = expanded === index;
              const activityMarks = getActivityMarks(bd);
              const hasBreakdown = bd && (hasMark(bd.ia1) || hasMark(bd.ia2) || hasMark(bd.lab1) || hasMark(bd.lab2) || hasMark(bd.assign1) || hasMark(bd.assign2) || hasMark(bd.finalIA));

              return (
                <article className={`native-result-card${isOpen ? " open" : ""}`} key={`${item.course}-${index}`}>
                  <button type="button" className="native-result-top" onClick={() => setExpanded(isOpen ? -1 : index)}>
                    <span className="result-score">{hasMark(primaryMark) ? primaryMark.obtained : "-"}</span>
                    <span className="result-copy">
                      <strong>{item.courseName || item.course}</strong>
                      <small>{item.course}{item.courseName ? " · Internal marks" : ""}</small>
                    </span>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {isOpen && (
                    <div className="result-breakdown">
                      <p>Breakdown</p>

                      {hasBreakdown ? (
                        <>
                          <div className="result-marks-grid">
                            <div className="result-mark-cell">
                              <span className="result-mark-label">IA1</span>
                              <span className={`result-mark-value${bd.ia1?.obtained !== null ? "" : " empty"}`}>
                                {formatMark(bd.ia1)}
                              </span>
                            </div>
                            <div className="result-mark-cell">
                              <span className="result-mark-label">IA2</span>
                              <span className={`result-mark-value${bd.ia2?.obtained !== null ? "" : " empty"}`}>
                                {formatMark(bd.ia2)}
                              </span>
                            </div>
                            <div className="result-mark-cell">
                              <span className="result-mark-label">{activityMarks[0].label}</span>
                              <span className={`result-mark-value${hasMark(activityMarks[0].mark) ? "" : " empty"}`}>
                                {formatMark(activityMarks[0].mark)}
                              </span>
                            </div>
                            <div className="result-mark-cell">
                              <span className="result-mark-label">{activityMarks[1].label}</span>
                              <span className={`result-mark-value${hasMark(activityMarks[1].mark) ? "" : " empty"}`}>
                                {formatMark(activityMarks[1].mark)}
                              </span>
                            </div>
                            <div className="result-mark-cell highlight">
                              <span className="result-mark-label">Final IA</span>
                              <span className={`result-mark-value${bd.finalIA?.obtained !== null ? "" : " empty"}`}>
                                {formatMark(bd.finalIA)}
                              </span>
                            </div>
                          </div>

                          {primaryMark.max !== null && primaryMark.max !== undefined && (
                            <div className="result-attendance-row">
                              <span>Max marks</span>
                              <strong>{primaryMark.max}</strong>
                            </div>
                          )}

                          {bd.attendance && (
                            <div className="result-attendance-row">
                              <span>Attendance</span>
                              <strong className={
                                parseFloat(bd.attendance) >= 75 ? "safe-text" : "danger-text"
                              }>{bd.attendance}</strong>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div><span>Final ISA</span><strong>{formatMark(primaryMark)}</strong></div>
                          {primaryMark.max !== null && primaryMark.max !== undefined && (
                            <div><span>Max marks</span><strong>{primaryMark.max}</strong></div>
                          )}
                          <div><span>Published score</span><strong className="safe-text">{hasMark(primaryMark) ? `${primaryMark.obtained} marks` : "-"}</strong></div>
                        </>
                      )}
                      <div><span>Source</span><strong>SVIT ERP</strong></div>
                    </div>
                  )}
                </article>
              );
            }) : <p className="subtle">No internal marks data found.</p>}
          </section>
        </>
      )}

      {activeTab === "esa" && (
        <div className="fade-in" style={{ display: "grid", gap: "16px" }}>
          
          {/* Combined Compact Header & Solver Panel */}
          <section className="panel" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
              <div>
                <span className="eyebrow" style={{ fontSize: "0.68rem" }}>Predicted SGPA</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
                    {currentSgpa.toFixed(2)}
                  </h2>
                  <span className="subtle" style={{ fontSize: "0.85rem" }}>/ 10.00</span>
                </div>
              </div>

              {/* Minimal Stats Line */}
              <div style={{ display: "flex", gap: "14px", fontSize: "0.78rem", fontWeight: 700 }}>
                <div>
                  <span className="subtle">Credits: </span>
                  <span style={{ color: "var(--ink)" }}>{totalCredits}</span>
                </div>
                <div>
                  <span className="subtle">Status: </span>
                  {failedCount > 0 ? (
                    <span style={{ color: "var(--danger)" }}>{failedCount} Failing</span>
                  ) : (
                    <span style={{ color: "var(--success)" }}>All Clear</span>
                  )}
                </div>
              </div>
            </div>
            {/* Target SGPA Slider (Compact & Responsive) */}
            <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 750, display: "flex", alignItems: "center", gap: "6px", color: "var(--ink)" }}>
                  <Target size={14} color="var(--primary)" /> Target Goal
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 850, color: "var(--primary)" }}>
                  {Number(targetSgpa || currentSgpa).toFixed(2)}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input 
                  type="range" 
                  min="4.00" 
                  max="10.00" 
                  step="0.05"
                  value={targetSgpa || currentSgpa.toFixed(2)} 
                  onChange={(e) => handleTargetChange(e.target.value)}
                  style={{ 
                    width: "100%", 
                    accentColor: "var(--primary)",
                    height: "6px",
                    cursor: "pointer"
                  }}
                />
                
                {/* Compact Preset Chips Centered Below Slider */}
                <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 750, marginRight: "4px" }}>Presets:</span>
                  {[7.5, 8.0, 8.5, 9.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => applyPreset(val)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        background: (targetSgpa && Math.abs(Number(targetSgpa) - val) < 0.01) ? "var(--primary)" : "var(--surface-soft)",
                        color: (targetSgpa && Math.abs(Number(targetSgpa) - val) < 0.01) ? "#ffffff" : "var(--muted)",
                        border: "1px solid var(--line)",
                        transition: "all 150ms ease"
                      }}
                    >
                      {val.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>

              {solverResult && (
                <div style={{ fontSize: "0.76rem", color: solverResult.success ? "var(--success)" : "var(--danger)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                  {solverResult.success ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  <span>{solverResult.message}</span>
                </div>
              )}
            </div>
          </section>

          {/* Subject Row List with Custom CIE & SEE prediction */}
          <section className="native-list" style={{ display: "grid", gap: "12px" }}>
            {cie.length ? cie.map((item) => {
              const primaryMark = getPrimaryMark(item);
              const cieVal = customCie[item.course] ?? toNumber(primaryMark.obtained);
              const seeVal = projectedMarks[item.course] ?? 60;
              const credits = courseCredits[item.course] ?? guessCredits(item.course, item.courseName);
              const { total, grade, isPass, reason } = getGradeDetails(cieVal, seeVal);

              return (
                <article 
                  key={item.course}
                  className="panel"
                  style={{
                    padding: "16px",
                    display: "grid",
                    gap: "12px",
                    background: "var(--surface)",
                    borderRadius: "14px",
                    border: "1px solid var(--line)",
                    borderLeft: cieVal < 20 ? "4px solid var(--danger)" : (!isPass ? "4px solid var(--warning)" : "4px solid var(--success)"),
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                    transition: "border-color 150ms ease, box-shadow 150ms ease"
                  }}
                >
                  {/* Info Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em" }}>{item.course}</span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 6px", background: "var(--surface-soft)", borderRadius: "4px", color: "var(--muted)" }}>
                          Credits: {credits}
                        </span>
                      </div>
                      <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.3" }} title={item.courseName}>
                        {item.courseName || "Subject Name"}
                      </h3>
                    </div>

                    {/* Grade Badge */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                      <div 
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                          fontWeight: 850,
                          textAlign: "center",
                          minWidth: "50px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                          ...getGradeColorStyle(grade)
                        }}
                      >
                        {grade}
                      </div>
                      <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 700 }}>
                        GP: {getGradeDetails(cieVal, seeVal).point}
                      </span>
                    </div>
                  </div>

                  {/* Dual Sliders Container */}
                  <div style={{ display: "grid", gap: "14px", padding: "12px 0", borderTop: "1px dashed var(--line)", borderBottom: "1px dashed var(--line)" }}>
                    {/* CIE Slider */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 750, color: "var(--ink)" }}>CIE (Internals)</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", fontWeight: 800, color: "var(--muted)" }}>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={cieVal}
                            onChange={(e) => handleCieSliderChange(item.course, Math.min(50, Math.max(0, Number(e.target.value))))}
                            style={{
                              width: "42px",
                              padding: "2px 4px",
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              textAlign: "center",
                              background: "var(--surface-soft)",
                              border: "1px solid var(--line)",
                              borderRadius: "6px",
                              color: "var(--primary)"
                            }}
                          />
                          <span>/ 50</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={cieVal}
                        onChange={(e) => handleCieSliderChange(item.course, e.target.value)}
                        style={{
                          width: "100%",
                          accentColor: "var(--primary)",
                          height: "6px",
                          cursor: "pointer"
                        }}
                      />
                    </div>

                    {/* SEE Slider */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 750, color: "var(--ink)" }}>SEE (Written Exam)</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", fontWeight: 800, color: "var(--muted)" }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={cieVal < 20 ? 0 : seeVal}
                            disabled={cieVal < 20}
                            onChange={(e) => handleSliderChange(item.course, Math.min(100, Math.max(0, Number(e.target.value))))}
                            style={{
                              width: "42px",
                              padding: "2px 4px",
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              textAlign: "center",
                              background: cieVal < 20 ? "rgba(0,0,0,0.05)" : "var(--surface-soft)",
                              border: "1px solid var(--line)",
                              borderRadius: "6px",
                              color: "var(--accent)",
                              cursor: cieVal < 20 ? "not-allowed" : "default"
                            }}
                          />
                          <span style={{ fontSize: "0.74rem" }}>/ 100</span>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, marginLeft: "4px" }}>({Math.round(seeVal / 2)} scaled)</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cieVal < 20 ? 0 : seeVal}
                        disabled={cieVal < 20}
                        onChange={(e) => handleSliderChange(item.course, e.target.value)}
                        style={{
                          width: "100%",
                          accentColor: "var(--accent)",
                          height: "6px",
                          cursor: cieVal < 20 ? "not-allowed" : "pointer"
                        }}
                      />
                    </div>
                  </div>

                  {/* Summary & Alerts Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {/* Credit Selection */}
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700 }}>Credits:</span>
                      <select 
                        value={credits}
                        onChange={(e) => handleCreditChange(item.course, e.target.value)}
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          background: "var(--surface-soft)",
                          border: "1px solid var(--line)",
                          borderRadius: "4px",
                          color: "var(--primary)",
                          padding: "2px 6px",
                          cursor: "pointer"
                        }}
                      >
                        {[1, 2, 3, 4].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <span 
                      style={{ 
                        fontSize: "0.78rem", 
                        fontWeight: 850, 
                        color: isPass ? "var(--success)" : "var(--danger)",
                        background: isPass ? "rgba(33, 131, 92, 0.08)" : "rgba(255, 59, 48, 0.08)",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: isPass ? "1px solid rgba(33, 131, 92, 0.15)" : "1px solid rgba(255, 59, 48, 0.15)"
                      }}
                    >
                      Aggregate: {total} / 100
                    </span>
                  </div>

                  {/* Warning Alerts */}
                  {cieVal < 20 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: "6px", background: "rgba(255, 59, 48, 0.04)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255, 59, 48, 0.1)" }}>
                      <AlertTriangle size={12} />
                      <span>CIE fails minimum passing score (20/50). Student cannot write SEE.</span>
                    </div>
                  )}

                  {cieVal >= 20 && seeVal < 35 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--warning)", display: "flex", alignItems: "center", gap: "6px", background: "rgba(186, 100, 41, 0.04)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(186, 100, 41, 0.1)" }}>
                      <AlertTriangle size={12} />
                      <span>SEE fails minimum written passing score (35/100).</span>
                    </div>
                  )}

                  {cieVal >= 20 && seeVal >= 35 && !isPass && (
                    <div style={{ fontSize: "0.7rem", color: "var(--warning)", display: "flex", alignItems: "center", gap: "6px", background: "rgba(186, 100, 41, 0.04)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(186, 100, 41, 0.1)" }}>
                      <AlertTriangle size={12} />
                      <span>{reason}. CIE + scaled SEE must be &ge; 40.</span>
                    </div>
                  )}
                </article>
              );
            }) : <p className="subtle">No internal marks found.</p>}
          </section>

          {/* Minimalist VTU Footer Legend */}
          <footer style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--muted)", padding: "10px 0" }}>
            <span>* Calculations according to VTU absolute grading norms. CIE minimum: 20/50, SEE written minimum: 35/100, aggregate passing: 40/100.</span>
          </footer>
        </div>
      )}

    </main>
  );
}

