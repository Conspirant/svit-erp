"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { Calendar, Clock, BookOpen, AlertCircle, Sparkles, Filter, List, ArrowLeft } from "lucide-react";

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
  const [error, setError] = useState("");
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
      .catch((err) => {
        if (alive) setError("Failed to sync your registered subjects.");
      })
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
      // Perfect match or one contains the other (e.g. 1BMATC201 vs 1BMATC201-A)
      return normalizedReg.includes(normalizedExam) || normalizedExam.includes(normalizedReg);
    });
  };

  // Filter and sort exams
  const filteredExams = useMemo(() => {
    let list = EXAM_DATABASE;
    if (viewMode === "my") {
      list = EXAM_DATABASE.filter((exam) => isRegistered(exam.code));
    }
    
    // Sort chronologically by date
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
    if (diffDays > 1) return { label: `In ${diffDays} days`, type: "upcoming" };
    return { label: "Completed", type: "past" };
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
    <main className="page-shell fade-in native-screen" style={{ paddingBottom: "100px" }}>
      {/* Visual Header */}
      <section className="native-page-head" style={{ marginBottom: "16px" }}>
        <div>
          <h1>Exam Timetable</h1>
          <p>Visvesvaraya Technological University (VTU) · June/July 2026</p>
        </div>
      </section>

      {/* Countdown Card (Only if registered exams are found) */}
      {nextExam && viewMode === "my" && (
        <section 
          className="panel" 
          style={{
            background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)",
            color: "white",
            padding: "20px",
            marginBottom: "20px",
            border: "none",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(35, 102, 84, 0.25)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Faded background element */}
          <div style={{ position: "absolute", right: "-20px", bottom: "-30px", fontSize: "10rem", opacity: 0.08, fontWeight: 900, pointerEvents: "none" }}>VTU</div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-soft)", fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <Sparkles size={14} />
            <span>Next Target</span>
          </div>
          
          <h2 style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: "8px", lineHeight: 1.2 }}>
            {daysToNextExam === 0 ? "Your Exam is Today!" : daysToNextExam === 1 ? "Exam Tomorrow!" : `Next Exam in ${daysToNextExam} Days`}
          </h2>
          
          <div style={{ marginTop: "14px", padding: "12px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <strong style={{ fontSize: "0.95rem", display: "block" }}>{nextExam.title}</strong>
            <span style={{ fontSize: "0.78rem", opacity: 0.8, display: "block", marginTop: "4px" }}>
              Code: {nextExam.code} · {nextExam.day}, {new Date(nextExam.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </section>
      )}

      {/* Toggle View Options */}
      <div 
        style={{
          display: "flex",
          background: "var(--surface-soft)",
          padding: "4px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: "1px solid var(--line)"
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode("my")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            background: viewMode === "my" ? "var(--surface)" : "transparent",
            color: viewMode === "my" ? "var(--primary)" : "var(--muted)",
            boxShadow: viewMode === "my" ? "0 4px 10px rgba(0,0,0,0.04)" : "none",
            transition: "all 150ms ease"
          }}
        >
          <Filter size={15} />
          My Exams ({studentCourses.length})
        </button>
        <button
          type="button"
          onClick={() => setViewMode("all")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            background: viewMode === "all" ? "var(--surface)" : "transparent",
            color: viewMode === "all" ? "var(--primary)" : "var(--muted)",
            boxShadow: viewMode === "all" ? "0 4px 10px rgba(0,0,0,0.04)" : "none",
            transition: "all 150ms ease"
          }}
        >
          <List size={15} />
          All Exams ({EXAM_DATABASE.length})
        </button>
      </div>

      {/* Exam List */}
      <section className="native-list">
        {filteredExams.length > 0 ? (
          filteredExams.map((exam, idx) => {
            const countdown = getCountdown(exam.date);
            const registered = isRegistered(exam.code);
            
            // Styled tags for different countdown states
            const getBadgeStyles = (type) => {
              switch (type) {
                case "today":
                  return { bg: "var(--danger-soft)", color: "var(--danger)", border: "rgba(183, 51, 51, 0.15)" };
                case "tomorrow":
                  return { bg: "var(--warning-soft)", color: "var(--warning)", border: "rgba(167, 105, 19, 0.15)" };
                case "upcoming":
                  return { bg: "var(--success-soft)", color: "var(--success)", border: "rgba(33, 131, 92, 0.15)" };
                default:
                  return { bg: "var(--surface-strong)", color: "var(--muted)", border: "rgba(0,0,0,0.05)" };
              }
            };
            const badge = getBadgeStyles(countdown.type);

            return (
              <article 
                key={`${exam.code}-${idx}`} 
                className="panel"
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  border: registered && viewMode === "all" ? "2px solid var(--primary)" : "1px solid var(--line)",
                  position: "relative",
                  transition: "transform 150ms ease",
                  background: countdown.type === "today" ? "rgba(183, 51, 51, 0.02)" : "var(--surface)"
                }}
              >
                {/* Visual Accent for Registered Exams in All Mode */}
                {registered && viewMode === "all" && (
                  <span 
                    style={{
                      position: "absolute",
                      top: "-10px",
                      left: "14px",
                      background: "var(--primary)",
                      color: "white",
                      fontSize: "0.68rem",
                      fontWeight: 900,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      textTransform: "uppercase"
                    }}
                  >
                    Your Subject
                  </span>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Subject Code: {exam.code}
                    </span>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--ink)", marginTop: "4px", lineHeight: 1.35 }}>
                      {exam.title}
                    </h3>
                  </div>
                  
                  {/* Countdown pill */}
                  <span 
                    style={{
                      flexShrink: 0,
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      padding: "6px 10px",
                      background: badge.bg,
                      color: badge.color,
                      borderRadius: "8px",
                      border: `1px solid ${badge.border}`,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}
                  >
                    {countdown.label}
                  </span>
                </div>

                <div 
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "14px",
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px dashed var(--line)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--muted)" }}>
                    <Calendar size={13} color="var(--primary)" />
                    <span>{exam.day}, {new Date(exam.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--muted)" }}>
                    <Clock size={13} color="var(--primary)" />
                    <span>{exam.time}</span>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--line)" }}>
            <AlertCircle size={32} color="var(--muted)" style={{ margin: "0 auto 12px" }} />
            <strong style={{ display: "block", color: "var(--ink)" }}>No registered exams found.</strong>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>
              {viewMode === "my" 
                ? "Your subject codes do not match any exams in the VTU June/July 2026 scheme. Check the 'All Exams' list."
                : "No exams map in this scheme."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
