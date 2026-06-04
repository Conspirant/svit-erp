"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Unlock, Scan, Shield, BookOpen, Microscope, GraduationCap,
  Award, FileText, ExternalLink, ChevronDown, ChevronUp,
  Clock, AlertCircle, RefreshCw, Sparkles, Users, Star,
  FlaskConical, BookMarked, Briefcase, Globe, Loader2
} from "lucide-react";

export default function UnlockedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [erpData, setErpData] = useState(null);
  const [xrayData, setXrayData] = useState(null);
  const [xrayLoading, setXrayLoading] = useState(false);
  const [expandedProf, setExpandedProf] = useState(null);
  const [scanPhase, setScanPhase] = useState("");
  const [dept, setDept] = useState("");

  // Load cached data from sessionStorage on mount
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const cached = sessionStorage.getItem("erp_unlocked_data");
        if (cached) {
          const parsed = JSON.parse(cached);
          setErpData(parsed);
          setLoading(false);
        }
        const cachedXray = sessionStorage.getItem("faculty_xray_data");
        if (cachedXray) setXrayData(JSON.parse(cachedXray));
        const cachedDept = sessionStorage.getItem("dashboard_data");
        if (cachedDept) {
          const d = JSON.parse(cachedDept);
          setDept(d?.department || d?.data?.department || "");
        }
      } catch {}
    });
  }, []);

  // Auto-fetch on first load
  useEffect(() => {
    fetchUnlockedData();
  }, []);

  async function fetchUnlockedData() {
    setScanning(true);
    setScanPhase("Probing hidden ERP endpoints...");
    setError("");

    try {
      const res = await fetch("/api/student/erp-unlocked");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to scan");

      setErpData(json.data);
      sessionStorage.setItem("erp_unlocked_data", JSON.stringify(json.data));
      setLoading(false);

      // Auto-trigger Faculty X-Ray if we have timetable faculty data
      if (json.data?.timetable?.courseFaculty) {
        fetchFacultyXray(json.data.timetable.courseFaculty);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    } finally {
      setScanning(false);
      setScanPhase("");
    }
  }

  async function fetchFacultyXray(courseFaculty) {
    setXrayLoading(true);
    setScanPhase("Cross-referencing faculty with IRINS...");

    try {
      // Collect unique faculty names from all courses
      const allNames = new Set();
      Object.values(courseFaculty).forEach(names => {
        names.forEach(n => allNames.add(n));
      });

      if (allNames.size === 0) {
        setXrayLoading(false);
        return;
      }

      // Get department from sessionStorage
      let studentDept = dept;
      if (!studentDept) {
        try {
          const cached = sessionStorage.getItem("dashboard_data");
          if (cached) {
            const d = JSON.parse(cached);
            studentDept = d?.department || d?.data?.department || "";
          }
        } catch {}
      }

      const namesParam = [...allNames].join(",");
      const res = await fetch(`/api/faculty/xray?names=${encodeURIComponent(namesParam)}&dept=${encodeURIComponent(studentDept)}`);
      const json = await res.json();

      if (json.success) {
        setXrayData(json.data);
        sessionStorage.setItem("faculty_xray_data", JSON.stringify(json.data));
      }
    } catch (err) {
      console.error("Faculty X-Ray error:", err.message);
    } finally {
      setXrayLoading(false);
      setScanPhase("");
    }
  }

  // Compute which professors teach which courses
  const profCourses = useMemo(() => {
    if (!erpData?.timetable?.courseFaculty) return {};
    const map = {};
    for (const [course, names] of Object.entries(erpData.timetable.courseFaculty)) {
      names.forEach(name => {
        if (!map[name]) map[name] = [];
        map[name].push(course);
      });
    }
    return map;
  }, [erpData]);

  const discoveredCount = useMemo(() => {
    let count = 0;
    if (erpData?.proctorial) count++;
    if (erpData?.timetable?.days?.length > 0) count++;
    if (erpData?.feedback?.feedbackTypes?.length > 0) count++;
    if (erpData?.hiddenDashboards) {
      Object.values(erpData.hiddenDashboards).forEach(d => {
        if (d.available) count++;
      });
    }
    return count;
  }, [erpData]);

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  if (loading && !erpData) {
    return (
      <div style={styles.page}>
        <div style={styles.scanOverlay}>
          <div style={styles.scanIcon}>
            <Scan size={48} style={{ animation: "spin 2s linear infinite" }} />
          </div>
          <h2 style={styles.scanTitle}>Scanning ERP...</h2>
          <p style={styles.scanSubtext}>{scanPhase || "Probing hidden endpoints..."}</p>
          <div style={styles.scanBar}>
            <div style={styles.scanBarFill} />
          </div>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIconWrap}>
            <Unlock size={22} />
          </div>
          <div>
            <h1 style={styles.headerTitle}>ERP Unlocked</h1>
            <p style={styles.headerSub}>
              {discoveredCount} hidden pages discovered
              {erpData?.discoveredAt && (
                <span style={styles.timeAgo}> · scanned {timeAgo(erpData.discoveredAt)}</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={fetchUnlockedData}
          disabled={scanning}
          style={{ ...styles.scanBtn, opacity: scanning ? 0.6 : 1 }}
        >
          {scanning ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={16} />}
          {scanning ? "Scanning..." : "Re-Scan"}
        </button>
      </div>

      {error && (
        <div style={styles.errorCard}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ═══ Faculty X-Ray Section ═══ */}
      <div style={styles.sectionHeader}>
        <Microscope size={20} style={{ color: "#a78bfa" }} />
        <h2 style={styles.sectionTitle}>Faculty X-Ray</h2>
        <span style={styles.sectionBadge}>
          {xrayLoading ? "Scanning..." : xrayData ? `${xrayData.filter(f => f.matched).length} matched` : ""}
        </span>
      </div>
      <p style={styles.sectionDesc}>
        Your professors matched to their IRINS research profiles + Google Scholar metrics
      </p>

      {xrayLoading && (
        <div style={styles.xrayLoading}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#a78bfa" }} />
          <span>Cross-referencing {Object.keys(profCourses).length} faculty with IRINS database...</span>
        </div>
      )}

      {xrayData && xrayData.length > 0 && (
        <div style={styles.profGrid}>
          {xrayData.map((prof, i) => (
            <FacultyCard
              key={i}
              prof={prof}
              courses={profCourses[prof.erpName] || []}
              expanded={expandedProf === i}
              onToggle={() => setExpandedProf(expandedProf === i ? null : i)}
              timetable={erpData?.timetable}
            />
          ))}
        </div>
      )}

      {!xrayLoading && (!xrayData || xrayData.length === 0) && erpData?.timetable?.courseFaculty && (
        <div style={styles.emptyCard}>
          <Users size={24} style={{ opacity: 0.5 }} />
          <p>No faculty data found yet. Try re-scanning.</p>
        </div>
      )}

      {/* ═══ Proctorial Notes Section ═══ */}
      {erpData?.proctorial && (
        <>
          <div style={{ ...styles.sectionHeader, marginTop: 32 }}>
            <Shield size={20} style={{ color: "#f59e0b" }} />
            <h2 style={styles.sectionTitle}>Proctorial Notes</h2>
            <span style={styles.sectionBadge}>Hidden</span>
          </div>
          <p style={styles.sectionDesc}>
            Teacher observations from your proctor — this data exists in the ERP but students rarely see it
          </p>
          <ProctorialCard data={erpData.proctorial} />
        </>
      )}

      {/* ═══ Hidden Dashboards Section ═══ */}
      {erpData?.hiddenDashboards && (
        <>
          <div style={{ ...styles.sectionHeader, marginTop: 32 }}>
            <Sparkles size={20} style={{ color: "#06b6d4" }} />
            <h2 style={styles.sectionTitle}>Hidden Dashboards</h2>
            <span style={styles.sectionBadge}>Reverse-Engineered</span>
          </div>
          <p style={styles.sectionDesc}>
            Endpoints that exist in the ERP but have no visible links — students don't know these exist
          </p>
          <div style={styles.hiddenGrid}>
            {Object.entries(erpData.hiddenDashboards).map(([key, dash]) => (
              <HiddenDashCard key={key} id={key} data={dash} />
            ))}
          </div>
        </>
      )}

      {/* ═══ Feedback Section ═══ */}
      {erpData?.feedback?.feedbackTypes?.length > 0 && (
        <>
          <div style={{ ...styles.sectionHeader, marginTop: 32 }}>
            <BookMarked size={20} style={{ color: "#10b981" }} />
            <h2 style={styles.sectionTitle}>Feedback Forms</h2>
          </div>
          <div style={styles.feedbackGrid}>
            {erpData.feedback.feedbackTypes.map((fb, i) => (
              <div key={i} style={styles.feedbackCard}>
                <FileText size={18} style={{ color: "#10b981" }} />
                <span>{fb.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Data sourced by reverse-engineering the Accredia ERP + IRINS research database
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Faculty Card Component
// ═══════════════════════════════════════
function FacultyCard({ prof, courses, expanded, onToggle, timetable }) {
  const gs = prof.googleScholar;
  const hasResearch = prof.matched && (gs || prof.publicationCount > 0 || prof.awards?.length > 0 || prof.patents?.length > 0);

  return (
    <div style={{ ...styles.profCard, borderColor: prof.matched ? "#a78bfa33" : "#333" }}>
      <div style={styles.profHeader} onClick={onToggle}>
        <div style={styles.profLeft}>
          {prof.image && prof.image !== "https://saividya.ac.in/assets/images/faculty/empty.jpg" ? (
            <img src={prof.image} alt={prof.name} style={styles.profImg} />
          ) : (
            <div style={styles.profImgFallback}>
              <GraduationCap size={20} />
            </div>
          )}
          <div>
            <h3 style={styles.profName}>{prof.name || prof.erpName}</h3>
            <p style={styles.profDesig}>{prof.designation || "Faculty"}</p>
            {courses.length > 0 && (
              <div style={styles.profCourses}>
                {courses.map((c, i) => (
                  <span key={i} style={styles.courseTag}>{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={styles.profRight}>
          {prof.matched ? (
            <span style={styles.matchBadge}>✓ IRINS</span>
          ) : (
            <span style={styles.noMatchBadge}>No Profile</span>
          )}
          {hasResearch && (expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
        </div>
      </div>

      {/* Quick Stats Bar */}
      {prof.matched && (
        <div style={styles.statsBar}>
          {gs && (
            <>
              <div style={styles.stat}>
                <span style={styles.statNum}>{gs.hIndex}</span>
                <span style={styles.statLabel}>h-index</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statNum}>{gs.totalCitations}</span>
                <span style={styles.statLabel}>Citations</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statNum}>{gs.i10Index}</span>
                <span style={styles.statLabel}>i10-index</span>
              </div>
            </>
          )}
          <div style={styles.stat}>
            <span style={styles.statNum}>{prof.publicationCount || 0}</span>
            <span style={styles.statLabel}>Papers</span>
          </div>
          {prof.patents?.length > 0 && (
            <div style={styles.stat}>
              <span style={styles.statNum}>{prof.patents.length}</span>
              <span style={styles.statLabel}>Patents</span>
            </div>
          )}
          {prof.awards?.length > 0 && (
            <div style={styles.stat}>
              <span style={styles.statNum}>{prof.awards.length}</span>
              <span style={styles.statLabel}>Awards</span>
            </div>
          )}
        </div>
      )}

      {/* Expanded Detail */}
      {expanded && hasResearch && (
        <div style={styles.profDetail}>
          {prof.expertise?.length > 0 && (
            <div style={styles.detailSection}>
              <h4 style={styles.detailTitle}><FlaskConical size={14} /> Expertise</h4>
              <div style={styles.tagWrap}>
                {prof.expertise.map((e, i) => (
                  <span key={i} style={styles.expertiseTag}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {prof.recentPublications?.length > 0 && (
            <div style={styles.detailSection}>
              <h4 style={styles.detailTitle}><BookOpen size={14} /> Recent Publications</h4>
              {prof.recentPublications.map((pub, i) => (
                <div key={i} style={styles.pubItem}>
                  <p style={styles.pubTitle}>{pub.title}</p>
                  <p style={styles.pubMeta}>{pub.type} {pub.year && `· ${pub.year}`}</p>
                </div>
              ))}
            </div>
          )}

          {prof.patents?.length > 0 && (
            <div style={styles.detailSection}>
              <h4 style={styles.detailTitle}><Briefcase size={14} /> Patents</h4>
              {prof.patents.map((p, i) => (
                <div key={i} style={styles.pubItem}>
                  <p style={styles.pubTitle}>{p.title}</p>
                </div>
              ))}
            </div>
          )}

          {prof.awards?.length > 0 && (
            <div style={styles.detailSection}>
              <h4 style={styles.detailTitle}><Award size={14} /> Awards</h4>
              {prof.awards.map((a, i) => (
                <div key={i} style={styles.pubItem}>
                  <p style={styles.pubTitle}>{a.title}</p>
                  <p style={styles.pubMeta}>{a.year} {a.description && `· ${a.description}`}</p>
                </div>
              ))}
            </div>
          )}

          {prof.irinsUrl && (
            <a href={prof.irinsUrl} target="_blank" rel="noopener noreferrer" style={styles.irinsLink}>
              <Globe size={14} /> View Full IRINS Profile <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Proctorial Notes Component
// ═══════════════════════════════════════
function ProctorialCard({ data }) {
  if (!data) return null;

  return (
    <div style={styles.proctCard}>
      {data.headings?.filter(h => !h.includes("1VA") && h.length > 5).map((h, i) => (
        <h3 key={i} style={styles.proctHeading}>{h}</h3>
      ))}
      {data.notes?.map((table, i) => (
        <div key={i} style={styles.proctTable}>
          {table.map((row, j) => (
            <div key={j} style={styles.proctRow}>
              {row.map((cell, k) => (
                <span key={k} style={styles.proctCell}>{cell}</span>
              ))}
            </div>
          ))}
        </div>
      ))}
      {data.paragraphs?.length > 0 && data.paragraphs.map((p, i) => (
        <p key={i} style={styles.proctPara}>{p}</p>
      ))}
      {(!data.notes || data.notes.length === 0) && (!data.paragraphs || data.paragraphs.length === 0) && (
        <p style={styles.proctEmpty}>No proctorial notes recorded yet for this semester.</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Hidden Dashboard Card
// ═══════════════════════════════════════
function HiddenDashCard({ id, data }) {
  const icons = {
    examRegistration: <FileText size={22} />,
    cieEvaluation: <BookOpen size={22} />,
    revaluation: <RefreshCw size={22} />,
  };
  const colors = {
    examRegistration: "#818cf8",
    cieEvaluation: "#f59e0b",
    revaluation: "#06b6d4",
  };

  return (
    <div style={{
      ...styles.hiddenCard,
      borderColor: data.available ? colors[id] + "44" : "#333",
      opacity: data.available ? 1 : 0.5,
    }}>
      <div style={{ color: colors[id] || "#888" }}>
        {icons[id] || <FileText size={22} />}
      </div>
      <h3 style={styles.hiddenTitle}>{data.label}</h3>
      <span style={{
        ...styles.hiddenStatus,
        background: data.available ? colors[id] + "22" : "#ffffff0a",
        color: data.available ? colors[id] : "#666",
      }}>
        {data.available ? "Accessible" : "Not Available"}
      </span>
      {data.available && data.headings?.length > 0 && (
        <p style={styles.hiddenSnippet}>{data.headings[0]}</p>
      )}
    </div>
  );
}

// Helper
function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ═══════════════════════════════════════
// Keyframes
// ═══════════════════════════════════════
const keyframes = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scanLine {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
`;

// ═══════════════════════════════════════
// Styles
// ═══════════════════════════════════════
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e5e5e5",
    padding: "16px 16px 100px",
    fontFamily: "'Inter', -apple-system, sans-serif",
    maxWidth: 640,
    margin: "0 auto",
  },
  scanOverlay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 16,
  },
  scanIcon: { color: "#a78bfa" },
  scanTitle: { fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 },
  scanSubtext: { fontSize: 13, color: "#888", margin: 0, animation: "pulse 2s infinite" },
  scanBar: {
    width: 200,
    height: 3,
    background: "#1a1a2e",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  scanBarFill: {
    width: "40%",
    height: "100%",
    background: "linear-gradient(90deg, #a78bfa, #818cf8)",
    borderRadius: 4,
    animation: "scanLine 1.5s ease-in-out infinite",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0 20px",
    borderBottom: "1px solid #1a1a2e",
    marginBottom: 24,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "linear-gradient(135deg, #a78bfa22, #818cf822)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#a78bfa",
    border: "1px solid #a78bfa33",
  },
  headerTitle: { fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 },
  headerSub: { fontSize: 12, color: "#888", margin: "2px 0 0" },
  timeAgo: { color: "#666" },
  scanBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "#a78bfa18",
    border: "1px solid #a78bfa33",
    borderRadius: 10,
    color: "#a78bfa",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },

  errorCard: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    background: "#ff444422",
    border: "1px solid #ff444444",
    borderRadius: 12,
    color: "#ff8888",
    fontSize: 13,
    marginBottom: 16,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: "#fff", margin: 0, flex: 1 },
  sectionBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 6,
    background: "#a78bfa18",
    color: "#a78bfa",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sectionDesc: { fontSize: 12, color: "#666", margin: "4px 0 16px", lineHeight: 1.5 },

  xrayLoading: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px",
    background: "#a78bfa08",
    border: "1px solid #a78bfa22",
    borderRadius: 12,
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
  },

  profGrid: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 },

  profCard: {
    background: "#111118",
    borderRadius: 14,
    border: "1px solid #222",
    overflow: "hidden",
    animation: "slideIn 0.3s ease",
  },
  profHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    cursor: "pointer",
  },
  profLeft: { display: "flex", alignItems: "center", gap: 12, flex: 1 },
  profImg: { width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1px solid #333" },
  profImgFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "#1a1a2e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#555",
    border: "1px solid #333",
  },
  profName: { fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 },
  profDesig: { fontSize: 11, color: "#888", margin: "2px 0 0" },
  profCourses: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 },
  courseTag: {
    fontSize: 10,
    padding: "2px 7px",
    borderRadius: 5,
    background: "#818cf818",
    color: "#818cf8",
    fontWeight: 500,
    fontFamily: "monospace",
  },
  profRight: { display: "flex", alignItems: "center", gap: 8, color: "#888" },
  matchBadge: {
    fontSize: 10,
    padding: "3px 8px",
    borderRadius: 6,
    background: "#10b98122",
    color: "#10b981",
    fontWeight: 600,
  },
  noMatchBadge: {
    fontSize: 10,
    padding: "3px 8px",
    borderRadius: 6,
    background: "#ffffff08",
    color: "#666",
    fontWeight: 500,
  },

  statsBar: {
    display: "flex",
    gap: 0,
    borderTop: "1px solid #1a1a2e",
    background: "#0d0d14",
  },
  stat: {
    flex: 1,
    padding: "10px 8px",
    textAlign: "center",
    borderRight: "1px solid #1a1a2e",
  },
  statNum: {
    display: "block",
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    fontFamily: "'Inter', monospace",
  },
  statLabel: { fontSize: 9, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" },

  profDetail: {
    padding: "0 16px 16px",
    borderTop: "1px solid #1a1a2e",
  },
  detailSection: { marginTop: 14 },
  detailTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#a78bfa",
    margin: "0 0 8px",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  expertiseTag: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 20,
    background: "#a78bfa12",
    color: "#c4b5fd",
    border: "1px solid #a78bfa22",
  },
  pubItem: {
    padding: "8px 0",
    borderBottom: "1px solid #1a1a2e",
  },
  pubTitle: { fontSize: 12, color: "#ddd", margin: 0, lineHeight: 1.5 },
  pubMeta: { fontSize: 10, color: "#666", margin: "4px 0 0" },
  irinsLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    fontSize: 12,
    color: "#a78bfa",
    textDecoration: "none",
  },

  proctCard: {
    background: "#111118",
    borderRadius: 14,
    border: "1px solid #f59e0b22",
    padding: "16px",
    marginBottom: 8,
  },
  proctHeading: { fontSize: 14, fontWeight: 600, color: "#f59e0b", margin: "0 0 10px" },
  proctTable: { marginBottom: 12 },
  proctRow: {
    display: "flex",
    gap: 12,
    padding: "6px 0",
    borderBottom: "1px solid #1a1a2e",
    fontSize: 12,
    color: "#ccc",
  },
  proctCell: { flex: 1 },
  proctPara: { fontSize: 13, color: "#aaa", lineHeight: 1.6, margin: "8px 0" },
  proctEmpty: { fontSize: 13, color: "#666", fontStyle: "italic" },

  hiddenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: 12,
    marginBottom: 8,
  },
  hiddenCard: {
    background: "#111118",
    borderRadius: 14,
    border: "1px solid #222",
    padding: "18px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    textAlign: "center",
  },
  hiddenTitle: { fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 },
  hiddenStatus: {
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 20,
  },
  hiddenSnippet: { fontSize: 10, color: "#666", margin: 0 },

  feedbackGrid: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
  feedbackCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    background: "#111118",
    borderRadius: 12,
    border: "1px solid #10b98122",
    fontSize: 13,
    color: "#ccc",
  },

  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "32px",
    color: "#555",
    fontSize: 13,
    textAlign: "center",
  },

  footer: {
    marginTop: 40,
    padding: "16px 0",
    borderTop: "1px solid #1a1a2e",
    textAlign: "center",
  },
  footerText: { fontSize: 11, color: "#444", margin: 0 },
};
