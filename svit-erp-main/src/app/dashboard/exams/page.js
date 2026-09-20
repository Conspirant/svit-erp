"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getMergedAttendance, filterElectives } from "@/lib/clientApi";
import { EXAM_DATABASE } from "@/lib/examSchedule";
import { AlertCircle, Sparkles } from "lucide-react";

export default function ExamsPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const viewMode = "my";

  // Fetch student dashboard data on mount
  useEffect(() => {
    let alive = true;
    
    // Quick load from cache if available
    queueMicrotask(() => {
      if (!alive) return;
      try {
        const cached = sessionStorage.getItem("dashboard_data");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.attendance) {
            setDashboardData(parsed);
            setLoading(false);
          }
        }
      } catch {}
    });

    apiFetch("/api/student/dashboard")
      .then((res) => {
        if (!alive) return;
        if (res.data) {
          setDashboardData(res.data);
          try {
            sessionStorage.setItem("dashboard_data", JSON.stringify(res.data));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, []);

  const homepageCourses = useMemo(() => {
    if (!dashboardData) return [];
    const merged = getMergedAttendance(dashboardData.attendance, dashboardData.usn);
    return filterElectives(merged);
  }, [dashboardData]);

  // Matcher for registered subjects
  const isRegistered = useCallback((examCode) => {
    const clean = (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const normalizedExam = clean(examCode);
    
    return homepageCourses.some((registered) => {
      const normalizedReg = clean(registered.course);
      
      // Extract semester digits (the first digit in the code after the initial prefix)
      const getSemDigit = (c) => {
        const withoutLeading = c.substring(1);
        const match = withoutLeading.match(/\d/);
        return match ? match[0] : null;
      };
      
      const regSem = getSemDigit(normalizedReg);
      const examSem = getSemDigit(normalizedExam);
      
      // If both codes have a semester digit, they must match!
      if (regSem && examSem && regSem !== examSem) {
        return false;
      }
      
      // Exact match after basic clean
      if (normalizedReg === normalizedExam) return true;
      
      // Match if one includes the other
      if (normalizedReg.includes(normalizedExam) || normalizedExam.includes(normalizedReg)) return true;
      
      // Remove any 'K' at index 5 (e.g. 1BESCK204A -> 1BESC204A)
      const regNoK = normalizedReg.replace(/^([A-Z0-9]{5})K/, "$1");
      const exNoK = normalizedExam.replace(/^([A-Z0-9]{5})K/, "$1");
      if (regNoK === exNoK) return true;

      // Fallback: match by course name
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
  }, [homepageCourses]);

  // Filter and sort exams
  const filteredExams = useMemo(() => {
    const list = EXAM_DATABASE.filter((exam) => isRegistered(exam.code));
    return [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [isRegistered]);

  // Compute countdown details
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

  // Next upcoming exam helper
  const nextExam = useMemo(() => {
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const upcoming = filteredExams
      .map(exam => ({ ...exam, dateObj: new Date(exam.date) }))
      .filter(exam => exam.dateObj >= now);
      
    return upcoming[0] || null;
  }, [filteredExams]);

  const daysToNextExam = useMemo(() => {
    if (!nextExam) return null;
    const now = new Date();
    now.setHours(0,0,0,0);
    const nextDate = new Date(nextExam.date);
    nextDate.setHours(0,0,0,0);
    const diff = nextDate - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [nextExam]);

  if (loading) return <div className="center-state"><div className="loader" /></div>;

  return (
    <main className="page-shell fade-in native-screen" style={{ paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" }}>
      
      {/* Dynamic Minimal Next-Exam Highlight Ticker */}
      {nextExam && viewMode === "my" && (
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(35, 102, 84, 0.05)",
            border: "1px solid rgba(35, 102, 84, 0.12)",
            borderRadius: "12px",
            padding: "10px 14px",
            marginBottom: "20px",
            fontSize: "0.82rem"
          }}
        >
          <Sparkles size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span style={{ color: "var(--primary-strong)", fontWeight: 700 }}>
            {daysToNextExam === 0 ? "You have an exam today!" : daysToNextExam === 1 ? "Next exam is tomorrow" : `Next exam is in ${daysToNextExam} days`}:
          </span>
          <span style={{ opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {nextExam.code}
          </span>
        </div>
      )}

      {/* Clean Header Section */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "12px",
          marginBottom: "24px"
        }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--primary)", letterSpacing: "0.04em" }}>
          YOUR EXAM SCHEDULE ({filteredExams.length} EXAMS)
        </span>
      </div>

      {/* Clean Timeline-Style Exam List */}
      <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredExams.length > 0 ? (
          filteredExams.map((exam, idx) => {
            const countdown = getCountdown(exam.date);
            const registered = isRegistered(exam.code);
            const parsedDate = new Date(exam.date);
            
            const isToday = countdown.type === "today";
            const isPast = countdown.type === "past";

            return (
              <article 
                key={`${exam.code}-${idx}`} 
                style={{
                  display: "flex",
                  gap: "16px",
                  padding: "12px 14px",
                  background: isToday ? "rgba(183, 51, 51, 0.03)" : "var(--surface)",
                  borderRadius: "12px",
                  border: isToday 
                    ? "1px solid rgba(183, 51, 51, 0.2)" 
                    : registered && viewMode === "all"
                      ? "1px solid rgba(35, 102, 84, 0.3)" 
                      : "1px solid var(--line)",
                  opacity: isPast ? 0.6 : 1,
                  transition: "opacity 150ms ease"
                }}
              >
                {/* Minimalist Date Plate */}
                <div 
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48px",
                    height: "48px",
                    background: isToday ? "var(--danger-soft)" : registered ? "var(--surface-soft)" : "rgba(0,0,0,0.02)",
                    borderRadius: "8px",
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", opacity: 0.6, color: isToday ? "var(--danger)" : "var(--ink)" }}>
                    {parsedDate.toLocaleDateString("en-IN", { month: "short" })}
                  </span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 950, color: isToday ? "var(--danger)" : "var(--ink)", marginTop: "-2px" }}>
                    {parsedDate.toLocaleDateString("en-IN", { day: "numeric" })}
                  </span>
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <span 
                      style={{ 
                        fontSize: "0.68rem", 
                        color: registered ? "var(--primary)" : "var(--muted)", 
                        fontWeight: 900, 
                        letterSpacing: "0.04em", 
                        textTransform: "uppercase" 
                      }}
                    >
                      {exam.code} {registered && viewMode === "all" && "• Registered"}
                    </span>
                    
                    {/* Tiny Countdown Pill */}
                    <span 
                      style={{ 
                        fontSize: "0.68rem", 
                        fontWeight: 900,
                        color: isToday 
                          ? "var(--danger)" 
                          : countdown.type === "tomorrow"
                            ? "var(--warning)"
                            : "var(--muted)",
                        textTransform: "uppercase"
                      }}
                    >
                      {countdown.label}
                    </span>
                  </div>
                  
                  <h3 
                    style={{ 
                      fontSize: "0.88rem", 
                      fontWeight: 800, 
                      color: "var(--ink)", 
                      marginTop: "3px", 
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {exam.title}
                  </h3>

                  <div style={{ display: "flex", gap: "12px", marginTop: "6px", opacity: 0.65, fontSize: "0.72rem" }}>
                    <span>{exam.day}</span>
                    <span>•</span>
                    <span>{exam.time}</span>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--line)" }}>
            <AlertCircle size={24} color="var(--muted)" style={{ margin: "0 auto 10px", opacity: 0.6 }} />
            <strong style={{ display: "block", color: "var(--ink)", fontSize: "0.88rem" }}>No registered exams.</strong>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "4px" }}>
              Your course codes do not match any exams in this VTU scheme.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
