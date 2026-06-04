"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck, ClipboardEdit, Sparkles, MessageSquare, Download,
  CheckCircle2, Printer, ArrowLeft, AlertCircle, Loader2, ShieldCheck,
  GraduationCap, RefreshCw, Star, Info
} from "lucide-react";

export default function FeedbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [feedbackTypes, setFeedbackTypes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [feedbackData, setFeedbackData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitLog, setSubmitLog] = useState([]);
  const [ratingIndex, setRatingIndex] = useState(0); // 0 = Excellent, 1 = Very Good, 2 = Good
  const [error, setError] = useState("");

  // Fetch available feedback forms on mount
  useEffect(() => {
    fetchFeedbackTypes();
  }, []);

  async function fetchFeedbackTypes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/feedback", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load feedbacks");

      setFeedbackTypes(json.data.feedbackTypes || []);
      
      // Auto-select first feedback if available
      if (json.data.feedbackTypes?.length > 0) {
        const firstId = json.data.feedbackTypes[0].id;
        setSelectedId(firstId);
        fetchFeedbackDetails(firstId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function fetchFeedbackDetails(id) {
    if (!id) return;
    setDetailsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/student/feedback?feedbackId=${id}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch feedback details");

      setFeedbackData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
      setLoading(false);
    }
  }

  const handleFeedbackSelect = (id) => {
    setSelectedId(id);
    fetchFeedbackDetails(id);
  };

  const startAutomation = async () => {
    if (!selectedId || !feedbackData || feedbackData.pending.length === 0) return;
    setSubmitting(true);
    setSubmitLog(["[→] Initializing automated feedback assistant...", `[→] Rating selected: ${ratingOptions[ratingIndex].label}`]);
    setError("");

    const pendingItems = [...feedbackData.pending];
    let successCount = 0;

    try {
      setSubmitLog(prev => [...prev, `[→] Beginning submission for ${pendingItems.length} faculty members...`]);

      for (let i = 0; i < pendingItems.length; i++) {
        const currentItem = pendingItems[i];
        setSubmitLog(prev => [...prev, `[→] [${i + 1}/${pendingItems.length}] Submitting feedback for ${currentItem.faculty}...`]);

        try {
          const res = await fetch("/api/student/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ feedbackId: selectedId, ratingIndex, formUrl: currentItem.url }),
          });

          if (res.status === 401) {
            throw new Error("Session expired. Please log in again.");
          }

          const json = await res.json();
          if (!json.success) throw new Error(json.error || "Submission failed");

          successCount++;
          setSubmitLog(prev => [...prev, `[✓] Submitted successfully for ${currentItem.faculty}`]);

          // Move the item from pending to completed in local state, and remove the question!
          setFeedbackData(prev => {
            if (!prev) return prev;
            const updatedPending = prev.pending.filter(p => p.url !== currentItem.url);
            const updatedCompleted = [...prev.completed, currentItem];
            return {
              ...prev,
              pending: updatedPending,
              completed: updatedCompleted
            };
          });

          // Polite delay between requests
          if (i < pendingItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (err) {
          setSubmitLog(prev => [...prev, `[❌] Failed for ${currentItem.faculty}: ${err.message}`]);
          if (err.message.includes("Session expired")) {
            throw err;
          }
        }
      }

      setSubmitLog(prev => [...prev, `[✓] Automation completed. Successfully submitted ${successCount}/${pendingItems.length} feedbacks!`]);
      
      // Finally, check for acknowledgement availability
      try {
        const refreshRes = await fetch(`/api/student/feedback?feedbackId=${selectedId}`, { cache: "no-store" });
        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          if (refreshJson.success) {
            setFeedbackData(refreshJson.data);
          }
        }
      } catch (_) {}

    } catch (err) {
      setError(err.message);
      setSubmitLog(prev => [...prev, `[❌] Automation stopped: ${err.message}`]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAcknowledgement = () => {
    if (!selectedId) return;
    // Open acknowledgement page in new window to print/save
    window.open(`/api/student/feedback?feedbackId=${selectedId}&action=acknowledgement`, "_blank");
  };

  const ratingOptions = [
    { label: "Excellent 🌟", desc: "Best option for top ratings (Default)" },
    { label: "Very Good 👍", desc: "Solid positive feedback" },
    { label: "Good 🙂", desc: "Satisfactory feedback" },
  ];

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.centerState}>
          <Loader2 size={36} style={{ animation: "spin 1.5s linear infinite", color: "var(--primary)" }} />
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: "0.9rem" }}>Connecting to ERP feedback portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/dashboard" style={styles.backBtn}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={styles.headerTitle}>Faculty Feedback</h1>
            <p style={styles.headerSub}>Auto-submission & Acknowledgement</p>
          </div>
        </div>
        <button onClick={fetchFeedbackTypes} style={styles.refreshBtn} aria-label="Refresh feedbacks">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div style={styles.errorCard}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {feedbackTypes.length === 0 ? (
        <div style={styles.emptyCard}>
          <ShieldCheck size={36} style={{ color: "var(--success)", opacity: 0.8 }} />
          <h3 style={{ margin: "12px 0 6px", color: "#fff" }}>No Feedback Forms Found</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
            The college ERP does not have any active feedback types open for your account right now.
          </p>
        </div>
      ) : (
        <>
          {/* Feedback Type Selection Tab bar */}
          {feedbackTypes.length > 1 && (
            <div style={styles.tabContainer}>
              {feedbackTypes.map((fb) => (
                <button
                  key={fb.id}
                  onClick={() => handleFeedbackSelect(fb.id)}
                  style={{
                    ...styles.tabBtn,
                    ...(selectedId === fb.id ? styles.tabBtnActive : {}),
                  }}
                >
                  {fb.name}
                </button>
              ))}
            </div>
          )}

          {detailsLoading ? (
            <div style={styles.innerLoading}>
              <Loader2 size={24} style={{ animation: "spin 1.2s linear infinite", color: "var(--primary)" }} />
              <span>Fetching staff feedback records...</span>
            </div>
          ) : feedbackData ? (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              
              {/* Stats Card */}
              <div style={styles.statsCard}>
                <div style={styles.statsHeader}>
                  <h3 style={styles.statsTitle}>{feedbackData.title || "Even Semester Feedback"}</h3>
                  {feedbackData.hasAcknowledgement && (
                    <span style={styles.completeBadge}>Completed</span>
                  )}
                </div>
                
                <div style={styles.statsGrid}>
                  <div style={styles.statBox}>
                    <span style={styles.statLabel}>Pending</span>
                    <span style={{ ...styles.statVal, color: feedbackData.pending.length > 0 ? "var(--accent)" : "#888" }}>
                      {feedbackData.pending.length}
                    </span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={styles.statLabel}>Completed</span>
                    <span style={{ ...styles.statVal, color: "var(--success)" }}>
                      {feedbackData.completed.length}
                    </span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={styles.statLabel}>Total Staff</span>
                    <span style={styles.statVal}>
                      {feedbackData.pending.length + feedbackData.completed.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acknowledgement Download Section */}
              {feedbackData.hasAcknowledgement && (
                <div style={styles.ackCard}>
                  <div style={styles.ackIconWrap}>
                    <ClipboardCheck size={24} style={{ color: "var(--success)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.ackTitle}>Acknowledgement Form Ready</h3>
                    <p style={styles.ackDesc}>All feedback entries submitted. Download or print the official acknowledgement receipt.</p>
                  </div>
                  <button onClick={handleDownloadAcknowledgement} style={styles.ackBtn}>
                    <Printer size={16} />
                    <span>Download</span>
                  </button>
                </div>
              )}

              {/* Automation Widget Card */}
              {feedbackData.pending.length > 0 && !submitting && (
                <div style={styles.widgetCard}>
                  <div style={styles.widgetHeader}>
                    <Sparkles size={18} style={{ color: "#a78bfa" }} />
                    <h3 style={styles.widgetTitle}>Automated Feedback Assistant</h3>
                  </div>
                  <p style={styles.widgetDesc}>
                    Submit positive feedback ratings for all remaining {feedbackData.pending.length} faculty members automatically.
                  </p>

                  {/* Rating selection cards */}
                  <div style={styles.ratingList}>
                    {ratingOptions.map((opt, i) => (
                      <div
                        key={i}
                        onClick={() => setRatingIndex(i)}
                        style={{
                          ...styles.ratingCard,
                          ...(ratingIndex === i ? styles.ratingCardActive : {}),
                        }}
                      >
                        <div style={styles.ratingInfo}>
                          <span style={styles.ratingLabel}>{opt.label}</span>
                          <span style={styles.ratingDesc}>{opt.desc}</span>
                        </div>
                        <div style={{
                          ...styles.radioCircle,
                          ...(ratingIndex === i ? styles.radioCircleActive : {}),
                        }} />
                      </div>
                    ))}
                  </div>

                  <button onClick={startAutomation} style={styles.submitBtn}>
                    <Sparkles size={16} />
                    <span>Mark All & Submit Feedback</span>
                  </button>
                </div>
              )}

              {/* Submission Logs Overlay/Container */}
              {submitting && (
                <div style={styles.logCard}>
                  <div style={styles.logHeader}>
                    <Loader2 size={16} style={{ animation: "spin 1.2s linear infinite", color: "#a78bfa" }} />
                    <h4 style={styles.logTitle}>Automating Submissions...</h4>
                  </div>
                  <div style={styles.logConsole}>
                    {submitLog.map((line, idx) => (
                      <div key={idx} style={styles.logLine}>{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Faculty List */}
              <div style={styles.sectionTitleWrap}>
                <h2 style={styles.sectionTitle}>Faculty & Courses</h2>
                <span style={styles.facultyCount}>
                  {feedbackData.pending.length + feedbackData.completed.length} total
                </span>
              </div>

              <div style={styles.facultyList}>
                {/* Pending Faculty */}
                {feedbackData.pending.map((item, idx) => (
                  <div key={`p-${idx}`} style={styles.facultyRow}>
                    <div style={styles.facultyInfo}>
                      <div style={styles.facultyTop}>
                        <GraduationCap size={16} style={{ color: "var(--muted)", marginTop: 2 }} />
                        <h4 style={styles.facultyName}>{item.faculty}</h4>
                      </div>
                      <p style={styles.courseMeta}>
                        <span style={styles.codeBadge}>{item.courseCode}</span>
                        <span style={styles.courseText}>{item.courseName}</span>
                      </p>
                    </div>
                    <span style={styles.pendingBadge}>Pending</span>
                  </div>
                ))}

                {/* Completed Faculty */}
                {feedbackData.completed.map((item, idx) => (
                  <div key={`c-${idx}`} style={styles.facultyRow}>
                    <div style={styles.facultyInfo}>
                      <div style={styles.facultyTop}>
                        <GraduationCap size={16} style={{ color: "var(--success)", opacity: 0.7, marginTop: 2 }} />
                        <h4 style={{ ...styles.facultyName, color: "#aaa" }}>{item.faculty}</h4>
                      </div>
                      <p style={styles.courseMeta}>
                        <span style={{ ...styles.codeBadge, opacity: 0.6 }}>{item.courseCode}</span>
                        <span style={{ ...styles.courseText, color: "#888" }}>{item.courseName}</span>
                      </p>
                    </div>
                    <span style={styles.doneBadge}>Feedback Given</span>
                  </div>
                ))}
              </div>

            </div>
          ) : null}
        </>
      )}

      {/* Info footer */}
      <div style={styles.footer}>
        <Info size={13} style={{ color: "var(--muted)" }} />
        <span>Submitting feedback automatically bypasses repetitive forms and generates the official receipt.</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// CSS Keyframes & Animations
// ═══════════════════════════════════════
const keyframes = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

// ═══════════════════════════════════════
// Premium Styles
// ═══════════════════════════════════════
const styles = {
  page: {
    minHeight: "100vh",
    background: "#08080a",
    color: "#e2e8f0",
    padding: "16px 16px 100px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: 600,
    margin: "0 auto",
  },
  centerState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0 18px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    color: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 750,
    color: "#fff",
    margin: 0,
  },
  headerSub: {
    fontSize: 11,
    color: "var(--muted)",
    margin: "2px 0 0",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "rgba(35, 102, 84, 0.08)",
    border: "1px solid rgba(35, 102, 84, 0.2)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  errorCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    background: "rgba(183, 51, 51, 0.12)",
    border: "1px solid rgba(183, 51, 51, 0.25)",
    borderRadius: 10,
    color: "#ff8a8a",
    fontSize: 13,
    marginBottom: 16,
  },
  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: 14,
    marginTop: 20,
  },
  tabContainer: {
    display: "flex",
    gap: 6,
    padding: 4,
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
    marginBottom: 16,
    overflowX: "auto",
  },
  tabBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    background: "transparent",
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 12px",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  },
  tabBtnActive: {
    background: "var(--primary)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(35, 102, 84, 0.2)",
  },
  innerLoading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "40px 0",
    color: "var(--muted)",
    fontSize: 13,
  },
  statsCard: {
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#fff",
    margin: 0,
  },
  completeBadge: {
    fontSize: 10,
    fontWeight: 800,
    padding: "3px 8px",
    background: "rgba(33, 131, 92, 0.12)",
    border: "1px solid rgba(33, 131, 92, 0.25)",
    color: "var(--success)",
    borderRadius: 6,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  statBox: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: "10px 8px",
    textAlign: "center",
  },
  statLabel: {
    display: "block",
    fontSize: 10,
    color: "var(--muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 4,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 850,
    color: "#fff",
  },
  ackCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(33, 131, 92, 0.04)",
    border: "1px solid rgba(33, 131, 92, 0.18)",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 16,
  },
  ackIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "rgba(33, 131, 92, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ackTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#fff",
    margin: 0,
  },
  ackDesc: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    margin: "3px 0 0",
    lineHeight: 1.4,
  },
  ackBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "var(--success)",
    color: "#fff",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(33, 131, 92, 0.2)",
    border: "none",
  },
  widgetCard: {
    background: "linear-gradient(135deg, rgba(167, 139, 250, 0.05), rgba(129, 140, 248, 0.02))",
    border: "1px solid rgba(167, 139, 250, 0.16)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  widgetHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  widgetTitle: {
    fontSize: 13,
    fontWeight: 850,
    color: "#c4b5fd",
    margin: 0,
    letterSpacing: "0.2px",
  },
  widgetDesc: {
    fontSize: 11.5,
    color: "#94a3b8",
    margin: "0 0 14px",
    lineHeight: 1.45,
  },
  ratingList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },
  ratingCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  ratingCardActive: {
    background: "rgba(167, 139, 250, 0.06)",
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  ratingInfo: {
    display: "flex",
    flexDirection: "column",
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: 750,
    color: "#fff",
  },
  ratingDesc: {
    fontSize: 10,
    color: "var(--muted)",
    marginTop: 2,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: "1.5px solid #475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#a78bfa",
    background: "#a78bfa",
  },
  submitBtn: {
    width: "100%",
    minHeight: 40,
    background: "linear-gradient(135deg, #a78bfa, #818cf8)",
    color: "#fff",
    borderRadius: 11,
    fontSize: 13,
    fontWeight: 850,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    border: "none",
    boxShadow: "0 4px 16px rgba(167, 139, 250, 0.25)",
    transition: "all 0.2s ease",
  },
  logCard: {
    background: "#0c0d12",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  logHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  logTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#c4b5fd",
    margin: 0,
    fontFamily: "monospace",
  },
  logConsole: {
    background: "rgba(0,0,0,0.3)",
    borderRadius: 8,
    padding: 10,
    maxHeight: 180,
    overflowY: "auto",
    fontFamily: "monospace",
    fontSize: 10.5,
    color: "#cbd5e1",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  logLine: {
    lineHeight: 1.4,
  },
  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: 800,
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: 0,
  },
  facultyCount: {
    fontSize: 11,
    color: "var(--muted)",
  },
  facultyList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  facultyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  facultyInfo: {
    flex: 1,
    minWidth: 0,
  },
  facultyTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
  },
  facultyName: {
    fontSize: 12.5,
    fontWeight: 750,
    color: "#fff",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  courseMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    minWidth: 0,
  },
  codeBadge: {
    fontSize: 9.5,
    fontWeight: 700,
    background: "rgba(255,255,255,0.05)",
    padding: "1px 5px",
    borderRadius: 4,
    color: "#94a3b8",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  courseText: {
    fontSize: 10.5,
    color: "#94a3b8",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  pendingBadge: {
    fontSize: 9,
    fontWeight: 800,
    padding: "3px 7px",
    background: "rgba(183, 51, 51, 0.1)",
    border: "1px solid rgba(183, 51, 51, 0.2)",
    color: "#ff6b6b",
    borderRadius: 5,
    textTransform: "uppercase",
    letterSpacing: "0.2px",
    flexShrink: 0,
  },
  doneBadge: {
    fontSize: 9,
    fontWeight: 800,
    padding: "3px 7px",
    background: "rgba(33, 131, 92, 0.1)",
    border: "1px solid rgba(33, 131, 92, 0.2)",
    color: "var(--success)",
    borderRadius: 5,
    textTransform: "uppercase",
    letterSpacing: "0.2px",
    flexShrink: 0,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 32,
    fontSize: 10.5,
    color: "var(--muted)",
    lineHeight: 1.4,
  },
};
