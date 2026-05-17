"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { Calendar, Clock, AlertCircle, Sparkles, Filter, List } from "lucide-react";

// VTU June/July 2026 Timetable Database (Individual subjects parsed from image)
const EXAM_DATABASE = [
  // Day 1: 16-06-2026
  { code: "1BMATM201", title: "Multivariable Calculus and Numerical Methods", date: "2026-06-16", day: "Tuesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BMATE201", title: "Calculus, Laplace Transform and Numerical Techniques", date: "2026-06-16", day: "Tuesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BMATC201", title: "Differential Calculus & Numerical Methods", date: "2026-06-16", day: "Tuesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BMATS201", title: "Numerical Methods", date: "2026-06-16", day: "Tuesday", time: "2:00 PM to 5:00 PM" },

  // Day 2: 17-06-2026
  { code: "1BESC104A", title: "Building Sciences & Mechanics", date: "2026-06-17", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BESC104B", title: "Introduction to Electrical Engineering", date: "2026-06-17", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BESC104C", title: "Introduction to Electronics & Communication Engineering", date: "2026-06-17", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BESC104D", title: "Introduction to Mechanical Engineering", date: "2026-06-17", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BESC104E", title: "Essentials of Information Technology", date: "2026-06-17", day: "Wednesday", time: "2:00 PM to 5:00 PM" },

  // Day 3: 18-06-2026
  { code: "1BAIA103", title: "Introduction to AI and Applications", date: "2026-06-18", day: "Thursday", time: "2:00 PM to 5:00 PM" },
  { code: "1BAIA203", title: "Introduction to AI and Applications", date: "2026-06-18", day: "Thursday", time: "2:00 PM to 5:00 PM" },

  // Day 4: 19-06-2026
  { code: "1BKSK109", title: "Samskrutika Kannada", date: "2026-06-19", day: "Friday", time: "2:00 PM to 3:00 PM" },
  { code: "1BKSK209", title: "Samskrutika Kannada", date: "2026-06-19", day: "Friday", time: "2:00 PM to 3:00 PM" },
  { code: "1BKBK109", title: "Balake Kannada", date: "2026-06-19", day: "Friday", time: "2:00 PM to 3:00 PM" },
  { code: "1BKBK209", title: "Balake Kannada", date: "2026-06-19", day: "Friday", time: "2:00 PM to 3:00 PM" },

  // Day 5: 22-06-2026
  { code: "1BPHYC102", title: "Physics for Sustainable Structural Systems", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHYC202", title: "Physics for Sustainable Structural Systems", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHYM102", title: "Physics of Materials", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHYM202", title: "Physics of Materials", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHEC102", title: "Quantum Physics and Electronics Sensors", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHEC202", title: "Quantum Physics and Electronics Sensors", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHEE102", title: "Electrical Engineering Materials", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHEE202", title: "Electrical Engineering Materials", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHYS102", title: "Quantum Physics and Applications", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPHYS202", title: "Quantum Physics and Applications", date: "2026-06-22", day: "Monday", time: "2:00 PM to 5:00 PM" },

  // Day 6: 24-06-2026
  { code: "1BCHEC102", title: "Applied Chemistry for Sustainable Structure & Material Design", date: "2026-06-24", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BCHEC202", title: "Applied Chemistry for Sustainable Structure & Material Design", date: "2026-06-24", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BCHEM102", title: "Applied Chemistry for Advanced Metal Protection and Sustainable Energy Systems", date: "2026-06-24", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BCHEM202", title: "Applied Chemistry for Advanced Metal Protection and Sustainable Energy Systems", date: "2026-06-24", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BCHEE102", title: "Applied Chemistry for Emerging Electronics and Futuristic Devices", date: "2026-06-24", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BCHEE202", title: "Applied Chemistry for Emerging Electronics and Futuristic Devices", date: "2026-06-24", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BCHES102", title: "Applied Chemistry for Smart Systems", date: "2026-06-24", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BCHES202", title: "Applied Chemistry for Smart Systems", date: "2026-06-24", day: "Wednesday", time: "2:00 PM to 5:00 PM" },

  // Day 7: 29-06-2026
  { code: "1BPLC105B", title: "Python Programming", date: "2026-06-29", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPLC205B", title: "Python Programming", date: "2026-06-29", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPLC105E", title: "Introduction to C Programming", date: "2026-06-29", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BPLC205E", title: "Introduction to C Programming", date: "2026-06-29", day: "Monday", time: "2:00 PM to 5:00 PM" },

  // Day 8: 01-07-2026
  { code: "1BCIV105", title: "Engineering Mechanics", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BCIV205", title: "Engineering Mechanics", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BBEE105", title: "Basics of Electrical Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BBEE205", title: "Basics of Electrical Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BECE105", title: "Fundamentals of Electronics & Communication Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BECE205", title: "Fundamentals of Electronics & Communication Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BEME105", title: "Elements of Mechanical Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BEME205", title: "Elements of Mechanical Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BEIT105", title: "Programming in C", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BEIT205", title: "Programming in C", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BEBT105", title: "Elements of Biotechnology and Biomimetics", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BEBT205", title: "Elements of Biotechnology and Biomimetics", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BSSA105", title: "Principles of Soil Science & Agronomy", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BSSA205", title: "Principles of Soil Science & Agronomy", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BEAE105", title: "Elements of Aeronautical Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BEAE205", title: "Elements of Aeronautical Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BETX105", title: "Technology of Textile", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BETX205", title: "Technology of Textile", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BECHE105", title: "Elements of Chemical Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BECHE205", title: "Elements of Chemical Engineering", date: "2026-07-01", day: "Wednesday", time: "2:00 PM to 5:00 PM" },

  // Day 9: 03-07-2026
  { code: "1BENG106", title: "Communication Skills", date: "2026-07-03", day: "Friday", time: "2:00 PM to 3:00 PM" },
  { code: "1BENG206", title: "Communication Skills", date: "2026-07-03", day: "Friday", time: "2:00 PM to 3:00 PM" },

  // Day 10: 06-07-2026
  { code: "1BESC204A", title: "Building Sciences & Mechanics", date: "2026-07-06", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BESC204B", title: "Introduction to Electrical Engineering", date: "2026-07-06", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BESC204C", title: "Introduction to Electronics & Communication Engineering", date: "2026-07-06", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BESC204D", title: "Introduction to Mechanical Engineering", date: "2026-07-06", day: "Monday", time: "2:00 PM to 5:00 PM" },
  { code: "1BESC204E", title: "Essentials of Information Technology", date: "2026-07-06", day: "Monday", time: "2:00 PM to 5:00 PM" },

  // Day 11: 07-07-2026
  { code: "1BMATM101", title: "Differential Calculus & Linear Algebra: ME Stream", date: "2026-07-07", day: "Tuesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BMATE101", title: "Differential Calculus & Linear Algebra: EEE Stream", date: "2026-07-07", day: "Tuesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BMATC101", title: "Differential Calculus & Linear Algebra: CV Stream", date: "2026-07-07", day: "Tuesday", time: "2:00 PM to 5:00 PM" },
  { code: "1BMATS101", title: "Calculus & Linear Algebra: CSE Stream", date: "2026-07-07", day: "Tuesday", time: "2:00 PM to 5:00 PM" }
];

export default function ExamsPage() {
  const router = useRouter();
  const [studentCourses, setStudentCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("my"); // "my" or "all"

  // Fetch student courses on mount
  useEffect(() => {
    let alive = true;
    
    // Quick load from cache if available
    queueMicrotask(() => {
      if (!alive) return;
      try {
        const cached = sessionStorage.getItem("dashboard_data");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.attendance) {
            setStudentCourses(parsed.attendance);
            setLoading(false);
          }
        }
      } catch {}
    });

    apiFetch("/api/student/dashboard")
      .then((res) => {
        if (!alive) return;
        if (res.data && res.data.attendance) {
          setStudentCourses(res.data.attendance);
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

  // Normalize subject code helper
  const normalize = (code) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Matcher for registered subjects
  const isRegistered = (examCode) => {
    const normalizedExam = normalize(examCode);
    return studentCourses.some((registered) => {
      const normalizedReg = normalize(registered.course);
      return normalizedReg.includes(normalizedExam) || normalizedExam.includes(normalizedReg);
    });
  };

  // Filter and sort exams
  const filteredExams = useMemo(() => {
    let list = EXAM_DATABASE;
    if (viewMode === "my") {
      list = EXAM_DATABASE.filter((exam) => isRegistered(exam.code));
    }
    return [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [viewMode, studentCourses]);

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
    const myExams = EXAM_DATABASE.filter((exam) => isRegistered(exam.code));
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const upcoming = myExams
      .map(exam => ({ ...exam, dateObj: new Date(exam.date) }))
      .filter(exam => exam.dateObj >= now)
      .sort((a, b) => a.dateObj - b.dateObj);
      
    return upcoming[0] || null;
  }, [studentCourses]);

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

      {/* Tabs / Filters - Very Minimal */}
      <div 
        style={{
          display: "flex",
          borderBottom: "1px solid var(--line)",
          marginBottom: "24px",
          gap: "16px"
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode("my")}
          style={{
            padding: "10px 4px",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            background: "transparent",
            color: viewMode === "my" ? "var(--primary)" : "var(--muted)",
            borderBottom: viewMode === "my" ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: "-1px",
            transition: "all 120ms ease"
          }}
        >
          My Schedule ({studentCourses.length})
        </button>
        <button
          type="button"
          onClick={() => setViewMode("all")}
          style={{
            padding: "10px 4px",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            background: "transparent",
            color: viewMode === "all" ? "var(--primary)" : "var(--muted)",
            borderBottom: viewMode === "all" ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: "-1px",
            transition: "all 120ms ease"
          }}
        >
          Full Scheme ({EXAM_DATABASE.length})
        </button>
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
