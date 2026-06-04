"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  CATEGORIES, TASK_STATUSES, ADMIN_USNS,
  formatReward, formatDeadline, formatTime, getCategoryInfo,
} from "@/lib/marketplaceUtils";

// ─── Nav order: Overview | Marketplace | Calendar | Timetable | Profile | Bunk | Connect
const NAV_TABS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/marketplace", label: "Marketplace" },
  { href: "/dashboard/events", label: "Calendar" },
  { href: "/dashboard/timetable", label: "Timetable" },
  { href: "/dashboard/info", label: "Profile" },
  { href: "/dashboard/bunk", label: "Bunk Calc" },
  { href: "/dashboard/connect", label: "Connect" },
  { href: "/dashboard/unlocked", label: "Unlocked" },
];

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "reward_high", label: "Top Reward" },
  { value: "ending_soon", label: "Ending Soon" },
];

const DEV_MARKETPLACE_PROFILE_KEY = "marketplace_dev_profile";
const DEV_RECEIVER_PROFILE = {
  name: "Dev Receiver",
  usn: "DEV25RX001",
  department: "CSE",
  semester: "2",
};
const IS_DEV_MARKETPLACE = process.env.NODE_ENV !== "production";
const HIDDEN_BROWSE_TASKS_KEY = "marketplace_hidden_browse_tasks";

function getDevMarketplaceProfile() {
  if (!IS_DEV_MARKETPLACE) return null;
  try { return JSON.parse(sessionStorage.getItem(DEV_MARKETPLACE_PROFILE_KEY) || "null"); } catch { return null; }
}

function getProfile() {
  const devProfile = getDevMarketplaceProfile();
  if (devProfile) return devProfile;
  try { return JSON.parse(sessionStorage.getItem("profile_data") || "{}"); } catch { return {}; }
}

function getProfileBranch(profile) {
  return profile?.department || profile?.course || "";
}

function getProfileSemester(profile) {
  return profile?.semester ? `Sem ${profile.semester}` : "";
}

function getPersonLine(name, branch, semester) {
  return [name, branch, semester].filter(Boolean).join(" · ");
}

function stripStoredProfileSuffix(name) {
  const value = String(name || "").trim();
  const parenSuffixStart = value.search(/\s+\((?=[\s\S]*(?:sem|semester|b\.?e|computer|engineering|cse|ise|ece|data science))/i);
  if (parenSuffixStart > -1) return value.slice(0, parenSuffixStart).trim() || value;
  return value
    .replace(/\s*·\s*(?:sem|semester|b\.?e|computer|engineering|cse|ise|ece|data science)[\s\S]*$/i, "")
    .trim() || value;
}

function hasStoredProfileSuffix(name) {
  const value = String(name || "");
  return /\((?=[\s\S]*(?:sem|semester|b\.?e|computer|engineering|cse|ise|ece|data science))[\s\S]*\)\s*$/i.test(value)
    || /·\s*(?:sem|semester|b\.?e|computer|engineering|cse|ise|ece|data science)/i.test(value);
}

function getTaskPosterLine(task, profile) {
  const isMine = profile?.usn && task.poster_usn?.toUpperCase() === profile.usn.toUpperCase();
  const rawName = task.poster_name || profile?.name || "Student";

  if (!isMine && !task.poster_branch && !task.poster_semester && hasStoredProfileSuffix(rawName)) {
    return rawName;
  }

  const branch = task.poster_branch || (isMine ? getProfileBranch(profile) : "");
  const semester = task.poster_semester ? `Sem ${task.poster_semester}` : (isMine ? getProfileSemester(profile) : "");
  return getPersonLine(stripStoredProfileSuffix(rawName), branch, semester);
}

function getHiddenBrowseTasks() {
  try { return JSON.parse(localStorage.getItem(HIDDEN_BROWSE_TASKS_KEY) || "[]"); } catch { return []; }
}

function saveHiddenBrowseTasks(ids) {
  try { localStorage.setItem(HIDDEN_BROWSE_TASKS_KEY, JSON.stringify(ids)); } catch { }
}

function getCompletedDeleteText(task) {
  if (task.status !== "completed" || !task.completed_at) return "";
  const deleteAt = new Date(task.completed_at);
  deleteAt.setDate(deleteAt.getDate() + 5);
  return `Auto-deletes ${deleteAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

function api(path, opts = {}) {
  return fetch(path, {
    ...opts,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

function StarRating({ value, onChange, size = 24 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button"
          style={{ background: "none", border: "none", cursor: onChange ? "pointer" : "default", fontSize: size, color: i <= (hover || value) ? "#f59e0b" : "var(--line)", padding: 0, lineHeight: 1 }}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(i)}
        >★</button>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = TASK_STATUSES[status] || TASK_STATUSES.open;
  return <span className="mk-status-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
}

function CategoryTag({ category }) {
  const cat = getCategoryInfo(category);
  return <span className="mk-category-tag" style={{ background: cat.color + "1a", color: cat.color, border: `1px solid ${cat.color}44` }}>{cat.label}</span>;
}

function DevMarketplaceBypass({ active, onChange }) {
  if (!IS_DEV_MARKETPLACE) return null;

  const enableReceiver = () => {
    sessionStorage.setItem(DEV_MARKETPLACE_PROFILE_KEY, JSON.stringify(DEV_RECEIVER_PROFILE));
    onChange(DEV_RECEIVER_PROFILE);
  };

  const disableReceiver = () => {
    sessionStorage.removeItem(DEV_MARKETPLACE_PROFILE_KEY);
    onChange(getProfile());
  };

  return (
    <div className="mk-dev-bypass">
      <span>Dev testing as: <strong>{active ? DEV_RECEIVER_PROFILE.name : "your login"}</strong></span>
      {active ? (
        <button type="button" className="button secondary" onClick={disableReceiver}>Use My Login</button>
      ) : (
        <button type="button" className="button secondary" onClick={enableReceiver}>Use Receiver</button>
      )}
    </div>
  );
}

function TaskCard({ task, profile, view, onOpen, onHideFromBrowse }) {
  const posterLine = getTaskPosterLine(task, profile);
  const isPoster = profile?.usn && task.poster_usn?.toUpperCase() === profile.usn.toUpperCase();
  const canHideFromBrowse = view === "browse" && task.status === "completed" && isPoster;
  const completedDeleteText = getCompletedDeleteText(task);
  const openTask = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    onOpen(task);
  };

  return (
    <div className="mk-task-card" onClick={openTask}>
      <div className="mk-task-card-top">
        <CategoryTag category={task.category} />
        <StatusBadge status={task.status} />
      </div>
      <h3 className="mk-task-title">{task.title}</h3>
      <p className="mk-task-desc">{task.description}</p>
      <div className="mk-task-card-footer">
        <span className="mk-reward">{formatReward(task.reward_amount)}</span>
        <span className="mk-deadline">{formatDeadline(task.deadline)}</span>
      </div>
      <div className="mk-poster-line">by {posterLine}</div>
      {completedDeleteText && <div className="mk-task-meta">{completedDeleteText}</div>}
      {canHideFromBrowse && (
        <button
          type="button"
          className="button secondary mk-card-action"
          onClick={(e) => {
            e.stopPropagation();
            onHideFromBrowse(task.id);
          }}
        >
          Hide from Browse
        </button>
      )}
      <div className="mk-task-meta">{formatTime(task.created_at)}</div>
    </div>
  );
}

function PostTaskModal({ profile, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", description: "", category: "other", reward_amount: "", deadline: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const res = await api("/api/student/marketplace", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          poster_name: profile?.name || "Student",
          poster_branch: getProfileBranch(profile),
          poster_semester: profile?.semester || "",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        onCreated({
          ...json.data,
          poster_branch: json.data?.poster_branch || getProfileBranch(profile),
          poster_semester: json.data?.poster_semester || profile?.semester || "",
        });
        onClose();
      }
      else setErr(json.error || "Failed to post task.");
    } catch { setErr("Network error. Try again."); }
    finally { setLoading(false); }
  };

  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);

  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-modal" onClick={e => e.stopPropagation()}>
        <div className="mk-modal-header">
          <h2 className="mk-modal-title">Post a Task</h2>
          <button className="mk-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="mk-form">
          <div className="field">
            <label>Task Title</label>
            <input className="input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Need notes for OS Unit 3" required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="input mk-textarea" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe what you need. No phone numbers, UPI IDs, or links allowed." required />
            <p className="mk-field-hint">⚠️ Contact info is automatically blocked.</p>
          </div>
          <div className="mk-form-row">
            <div className="field">
              <label>Category</label>
              <select className="input" value={form.category} onChange={e => set("category", e.target.value)} required>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Reward (₹)</label>
              <input className="input" type="number" min="50" max="5000" value={form.reward_amount} onChange={e => set("reward_amount", e.target.value)} placeholder="e.g. 200" required />
            </div>
            <div className="field">
              <label>Deadline</label>
              <input className="input" type="date" min={minDate.toISOString().split("T")[0]} value={form.deadline} onChange={e => set("deadline", e.target.value)} required />
            </div>
          </div>
          {err && <div className="notice error" style={{ marginTop: 0 }}>{err}</div>}
          <div className="mk-form-actions">
            <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button" disabled={loading}>{loading ? <span className="loader" /> : "Post Task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApplyModal({ task, profile, onClose, onApplied }) {
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const res = await api(`/api/student/marketplace/${task.id}/apply`, {
        method: "POST",
        body: JSON.stringify({
          message,
          applicant_name: profile?.name || "Student",
          applicant_branch: getProfileBranch(profile),
          applicant_semester: profile?.semester || "",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        alert("Your request has been sent. The person might require your help at the earliest and may contact you through our private chats interface, so please keep checking.");
        onApplied();
        onClose();
      }
      else setErr(json.error || "Failed to apply.");
    } catch { setErr("Network error."); }
    finally { setLoading(false); }
  };

  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="mk-modal-header">
          <h2 className="mk-modal-title">Apply for this task</h2>
          <button className="mk-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="mk-apply-task-info">
          <strong style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>{task.title}</strong>
          <span className="mk-reward" style={{ fontSize: "1.1rem", flexShrink: 0 }}>{formatReward(task.reward_amount)}</span>
        </div>
        <form onSubmit={submit} className="mk-form">
          <div className="field">
            <label>Why should they pick you? (optional)</label>
            <textarea className="input mk-textarea" style={{ minHeight: 80 }} value={message} onChange={e => setMessage(e.target.value)} placeholder="Briefly describe your approach..." />
          </div>
          {err && <div className="notice error" style={{ marginTop: 0 }}>{err}</div>}
          <div className="mk-form-actions">
            <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button" disabled={loading}>{loading ? <span className="loader" /> : "Send Application"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailModal({ taskId, profile, onClose, onUpdate }) {
  const [data, setData] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const myUsn = getProfile()?.usn?.toUpperCase() || "";
  const isAdmin = ADMIN_USNS.includes(myUsn);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/api/student/marketplace/${taskId}`);
      const json = await res.json();
      if (json.success) { setData(json.data); setApps(json.applications || []); }
    } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const doAction = async (action, extra = {}) => {
    setErr(""); setMsg(""); setActionLoading(action);
    try {
      const res = await api(`/api/student/marketplace/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (res.ok) {
        if (action === "complete") {
          alert("Work has been marked complete. The private chat for this task has now been deleted for both participants.");
          setMsg("Task completed. Private chat deleted.");
        } else {
          setMsg("Done!");
        }
        load();
        onUpdate && onUpdate();
      }
      else setErr(json.error || "Action failed.");
    } catch { setErr("Network error."); }
    finally { setActionLoading(""); }
  };

  const submitReview = async () => {
    if (!reviewRating) { setErr("Please select a rating."); return; }
    const target = myUsn === data?.poster_usn?.toUpperCase() ? data?.accepted_by_usn : data?.poster_usn;
    setErr(""); setActionLoading("review");
    try {
      const res = await api(`/api/student/marketplace/${taskId}/review`, {
        method: "POST",
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment, reviewed_usn: target }),
      });
      const json = await res.json();
      if (res.ok) { setMsg("Review submitted!"); setShowReview(false); load(); }
      else setErr(json.error || "Failed to submit review.");
    } finally { setActionLoading(""); }
  };

  if (loading) return (
    <div className="mk-modal-overlay">
      <div className="mk-modal" style={{ minHeight: 200, display: "grid", placeItems: "center" }}>
        <div className="loader" />
      </div>
    </div>
  );
  if (!data) return null;

  const poster = data.poster_usn?.toUpperCase();
  const doer = data.accepted_by_usn?.toUpperCase();
  const isPoster = myUsn === poster;
  const isDoer = myUsn === doer;
  const canApply = data.status === "open" && !isPoster && !!myUsn;
  const canCancel = data.status === "open" && (isPoster || isAdmin);
  const canSubmit = data.status === "accepted" && isDoer;
  const canComplete = data.status === "submitted" && isPoster;
  const canDispute = ["accepted", "submitted"].includes(data.status) && (isPoster || isDoer);
  const canReview = data.status === "completed" && (isPoster || isDoer);
  const canResolve = data.status === "disputed" && isAdmin;
  const canSeeContact = ["accepted", "submitted", "completed", "disputed"].includes(data.status) && (isPoster || isDoer || isAdmin);
  const canOpenPrivateChat = ["accepted", "submitted", "disputed"].includes(data.status) && (isPoster || isDoer);
  const posterLine = getTaskPosterLine(data, profile);

  // State machine — compact labels for mobile
  const steps = [
    { key: "open", label: "Open" },
    { key: "accepted", label: "Accepted" },
    { key: "submitted", label: "Done" },
    { key: "completed", label: "✓ Paid" },
  ];
  const stepKeys = steps.map(s => s.key);
  const stepIdx = stepKeys.indexOf(data.status);

  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-modal mk-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="mk-modal-header">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            <CategoryTag category={data.category} />
            <StatusBadge status={data.status} />
          </div>
          <button className="mk-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="mk-detail-body">
          <h2 className="mk-detail-title">{data.title}</h2>

          <div className="mk-detail-meta">
            <span>By <strong>{posterLine}</strong></span>
            <span className="mk-reward" style={{ fontSize: "1.2rem" }}>{formatReward(data.reward_amount)}</span>
            <span className="mk-deadline">{formatDeadline(data.deadline)}</span>
          </div>

          {/* ── State machine bar — wraps on mobile ── */}
          {["open", "accepted", "submitted", "completed"].includes(data.status) && (
            <div className="mk-state-bar">
              {steps.map((s, i) => (
                <div key={s.key} className={`mk-state-step${i <= stepIdx ? " done" : ""}${i === stepIdx ? " active" : ""}`}>
                  <div className="mk-state-dot" />
                  <span className="mk-state-label">{s.label}</span>
                  {i < steps.length - 1 && <div className="mk-state-line" />}
                </div>
              ))}
            </div>
          )}

          <p className="mk-detail-desc">{data.description}</p>

          {data.accepted_by_name && (
            <div className="soft-box">
              <span className="eyebrow">Accepted Doer</span>
              <p style={{ marginTop: 4, fontWeight: 700 }}>
                {data.accepted_by_name}{" "}
                <span className="subtle" style={{ fontWeight: 400, fontSize: "0.82rem" }}>({data.accepted_by_usn})</span>
              </p>
            </div>
          )}

          {canSeeContact && data.accepted_by_usn && (
            <div className="mk-contact-box">
              <div>
                <span className="eyebrow">Contact after acceptance</span>
                <p className="mk-contact-note">Only accepted participants can see this. Use the USN to identify each other in SVIT Connect or college groups.</p>
              </div>
              <div className="mk-contact-grid">
                <div>
                  <span>Poster</span>
                  <strong>{stripStoredProfileSuffix(data.poster_name || "Student")}</strong>
                  <code>{data.poster_usn}</code>
                </div>
                <div>
                  <span>Doer</span>
                  <strong>{data.accepted_by_name}</strong>
                  <code>{data.accepted_by_usn}</code>
                </div>
              </div>
              {canOpenPrivateChat ? (
                <Link className="button secondary" href={`/dashboard/connect?taskChat=${data.id}`}>Open Private Chat</Link>
              ) : (
                <p className="mk-contact-note">This task is complete, so its private chat has been deleted.</p>
              )}
            </div>
          )}

          {err && <div className="notice error" style={{ marginTop: 0 }}>{err}</div>}
          {msg && <div className="notice success" style={{ marginTop: 0 }}>{msg}</div>}

          {/* Applicants list (poster only) */}
          {apps.length > 0 && (isPoster || isAdmin) && (
            <div className="mk-applicants">
              <h3 className="panel-title" style={{ marginBottom: 10 }}>
                Applicants ({apps.length})
              </h3>
              {apps.map(app => (
                <div key={app.id} className="mk-app-card">
                  <div className="mk-app-top">
                    <strong>{app.applicant_name}</strong>
                    <span className="subtle" style={{ fontSize: "0.78rem" }}>{app.applicant_usn}</span>
                    {(app.applicant_branch || app.applicant_semester) && (
                      <span className="mk-person-meta">
                        {getPersonLine("", app.applicant_branch, app.applicant_semester ? `Sem ${app.applicant_semester}` : "")}
                      </span>
                    )}
                    <span className="mk-status-badge" style={{
                      color: app.status === "accepted" ? "var(--success)" : app.status === "rejected" ? "var(--danger)" : "var(--muted)",
                      background: app.status === "accepted" ? "var(--success-soft)" : app.status === "rejected" ? "var(--danger-soft)" : "var(--surface-soft)"
                    }}>{app.status}</span>
                  </div>
                  {app.message && <p className="mk-app-msg">{app.message}</p>}
                  {data.status === "open" && isPoster && app.status === "pending" && (
                    <button className="button" style={{ marginTop: 8, minHeight: 36, padding: "0 14px", fontSize: "0.85rem" }}
                      disabled={!!actionLoading}
                      onClick={() => doAction("accept", { applicant_usn: app.applicant_usn, applicant_name: app.applicant_name })}
                    >
                      {actionLoading === "accept" ? <span className="loader" /> : "Accept this person"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mk-action-strip">
            {canApply && <button className="button" onClick={() => setShowApply(true)}>Apply to do this</button>}
            {canSubmit && <button className="button" disabled={!!actionLoading} onClick={() => doAction("submit")}>{actionLoading === "submit" ? <span className="loader" /> : "Mark as Done"}</button>}
            {canComplete && <button className="button" disabled={!!actionLoading} onClick={() => doAction("complete")}>{actionLoading === "complete" ? <span className="loader" /> : "✓ Confirm Complete"}</button>}
            {canReview && !showReview && <button className="button secondary" onClick={() => setShowReview(true)}>Leave a Review</button>}
            {canDispute && !showDispute && (
              <button className="button secondary" style={{ color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => setShowDispute(true)}>Raise Dispute</button>
            )}
            {canCancel && (
              <button className="button secondary" disabled={!!actionLoading}
                onClick={() => { if (confirm("Cancel this task?")) doAction("cancel"); }}
              >{actionLoading === "cancel" ? <span className="loader" /> : "Cancel Task"}</button>
            )}
            {canResolve && (
              <button className="button" style={{ background: "var(--accent)" }} disabled={!!actionLoading} onClick={() => doAction("resolve")}>
                {actionLoading === "resolve" ? <span className="loader" /> : "Admin: Resolve"}
              </button>
            )}
          </div>

          {/* Dispute form */}
          {showDispute && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <textarea className="input mk-textarea" style={{ minHeight: 70 }} value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)} placeholder="Describe the issue clearly..." />
              <div className="mk-form-actions">
                <button className="button secondary" onClick={() => setShowDispute(false)}>Cancel</button>
                <button className="button" style={{ background: "var(--danger)" }} disabled={!!actionLoading}
                  onClick={() => { doAction("dispute", { reason: disputeReason }); setShowDispute(false); }}>Submit Dispute</button>
              </div>
            </div>
          )}

          {/* Review form */}
          {showReview && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4, background: "var(--surface-soft)", padding: 14, borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 8 }}>
                  Rate {myUsn === poster ? data.accepted_by_name : data.poster_name}
                </label>
                <StarRating value={reviewRating} onChange={setReviewRating} size={28} />
              </div>
              <input className="input" value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="How was the experience? (optional)" />
              <div className="mk-form-actions">
                <button className="button secondary" onClick={() => setShowReview(false)}>Cancel</button>
                <button className="button" disabled={!!actionLoading} onClick={submitReview}>{actionLoading === "review" ? <span className="loader" /> : "Submit Review"}</button>
              </div>
            </div>
          )}
        </div>

        {showApply && <ApplyModal task={data} profile={profile} onClose={() => setShowApply(false)} onApplied={load} />}
      </div>
    </div>
  );
}

export default function Marketplace() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [view, setView] = useState("browse");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [showPost, setShowPost] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [devProfileActive, setDevProfileActive] = useState(false);
  const [hiddenBrowseTasks, setHiddenBrowseTasks] = useState([]);

  // Load profile (branch + semester come from profile_data)
  useEffect(() => {
    queueMicrotask(() => {
      const devProfile = getDevMarketplaceProfile();
      setDevProfileActive(!!devProfile);
      const cached = devProfile || (() => { try { return JSON.parse(sessionStorage.getItem("profile_data") || "null"); } catch { return null; } })();
      if (cached) { setProfile(cached); setLoading(false); }
    });
    fetch("/api/student/profile").then(r => {
      if (r.status === 401) { router.push("/"); return null; }
      return r.json();
    }).then(j => {
      if (j?.success) {
        const devProfile = getDevMarketplaceProfile();
        setProfile(devProfile || j.data);
        setDevProfileActive(!!devProfile);
        setLoading(false);
        try { sessionStorage.setItem("profile_data", JSON.stringify(j.data)); } catch { }
      }
    }).catch(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      setHiddenBrowseTasks(getHiddenBrowseTasks());
    });
  }, []);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    const params = new URLSearchParams({ sort });
    if (category !== "all") params.set("category", category);
    if (search) params.set("search", search);
    if (view === "mine") params.set("mine", "1");
    if (view === "accepted") params.set("accepted", "1");
    try {
      const res = await api(`/api/student/marketplace?${params}`);
      const json = await res.json();
      if (res.ok) {
        setTasks(json.data || []);
        setIsAdmin(json.isAdmin || false);
        if (json.deletedCompletedCount > 0) {
          alert(`${json.deletedCompletedCount} completed marketplace task${json.deletedCompletedCount === 1 ? "" : "s"} older than 5 days were automatically deleted from the database.`);
        }
      }
    } finally { setTasksLoading(false); }
  }, [sort, category, search, view]);

  useEffect(() => {
    queueMicrotask(loadTasks);
  }, [loadTasks]);

  useEffect(() => {
    const sub = supabase.channel("marketplace_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_tasks" }, () => loadTasks())
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [loadTasks]);

  if (loading) return <div className="center-state"><div className="loader" /></div>;

  // Build profile info line
  const branch = getProfileBranch(profile);
  const sem = getProfileSemester(profile);
  const profileLine = [profile?.name, branch, sem].filter(Boolean).join(" · ");
  const handleDevProfileChange = (nextProfile) => {
    setProfile(nextProfile);
    setDevProfileActive(!!getDevMarketplaceProfile());
    setSelectedTask(null);
    queueMicrotask(loadTasks);
  };
  const hideTaskFromBrowse = (taskId) => {
    const next = [...new Set([...hiddenBrowseTasks, taskId])];
    setHiddenBrowseTasks(next);
    saveHiddenBrowseTasks(next);
    setTasks(prev => prev.filter(task => task.id !== taskId));
    alert("This completed task has been hidden from Browse on this device. It will still stay in My Posts and I'm Doing until it auto-deletes after 5 days.");
  };
  const visibleTasks = view === "browse"
    ? tasks.filter(task => !hiddenBrowseTasks.includes(task.id))
    : tasks;
  const openPostModal = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowPost(true);
  };

  return (
    <main className="page-shell fade-in">
      <header className="app-header">
        <div>
          <p className="eyebrow">SVIT Marketplace</p>
          <h1 className="title">Task Marketplace</h1>
          {profileLine && (
            <p className="subtle" style={{ marginTop: 6, fontSize: "0.85rem" }}>
              {profileLine}
              {isAdmin && <span className="badge danger" style={{ marginLeft: 10 }}>Admin</span>}
            </p>
          )}
          <p className="subtle" style={{ marginTop: 4, fontSize: "0.82rem" }}>Post tasks, earn money, build reputation.</p>
          <DevMarketplaceBypass active={devProfileActive} onChange={handleDevProfileChange} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
          <button className="button" onClick={openPostModal}>+ Post a Task</button>
          <button className="button secondary" onClick={() => router.push("/")}>Logout</button>
        </div>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        {NAV_TABS.map(t => (
          <Link key={t.href} className={`tab${t.href === "/dashboard/marketplace" ? " active" : ""}`} href={t.href}>
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Marketplace notice */}
      <div className="mk-security-notice">
        <span>🛒</span>
        <p><strong>Marketplace guide:</strong> Post academic tasks, notes requests, tutoring help, design work, or coding help for other students to pick up. Browse to find work, use My Posts to manage tasks you created, and use I&apos;m Doing to track work you accepted. Keep all coordination in the private task chat after acceptance.</p>
      </div>

      {/* View tabs + filters */}
      <div className="mk-toolbar">
        <div className="mk-view-tabs">
          {[["browse", "Browse"], ["mine", "My Posts"], ["accepted", "I'm Doing"]].map(([v, l]) => (
            <button key={v} className={`mk-view-btn${view === v ? " active" : ""}`} onClick={() => setView(v)}>{l}</button>
          ))}
        </div>
        <div className="mk-filters">
          <input className="input mk-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" />
          <select className="input mk-filter-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="input mk-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {tasksLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div className="loader" style={{ margin: "0 auto" }} />
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="mk-empty">
          <p style={{ fontSize: "2.5rem", marginBottom: 12 }}>🛒</p>
          <h3>{view === "mine" ? "You haven't posted any tasks yet." : view === "accepted" ? "You haven't accepted any tasks." : "No tasks found."}</h3>
          {view === "browse" && <p className="subtle">Be the first to post something!</p>}
          {view === "browse" && <button className="button" style={{ marginTop: 16 }} onClick={openPostModal}>Post a Task</button>}
        </div>
      ) : (
        <div className="mk-grid">
          {visibleTasks.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              profile={profile}
              view={view}
              onOpen={setSelectedTask}
              onHideFromBrowse={hideTaskFromBrowse}
            />
          ))}
        </div>
      )}

      {showPost && <PostTaskModal profile={profile} onClose={() => setShowPost(false)} onCreated={t => setTasks(prev => [t, ...prev])} />}
      {selectedTask && <TaskDetailModal taskId={selectedTask.id} profile={profile} onClose={() => setSelectedTask(null)} onUpdate={loadTasks} />}
    </main>
  );
}
