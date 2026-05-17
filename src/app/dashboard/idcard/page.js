"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IdCard, Camera, CheckCircle2, AlertTriangle, Maximize2, X, ShieldCheck, Lock } from "lucide-react";
import Barcode from "react-barcode";

/* ────────────────────────────────────────────────
   scannable barcode bit-pattern from any ASCII text
   ──────────────────────────────────────────────── */

const CODE128B_PATTERNS = [
  "11011001100","11001101100","11001100110","10010011000","10010001100",
  "10001001100","10011001000","10011000100","10001100100","11001001000",
  "11001000100","11000100100","10110011100","10011011100","10011001110",
  "10111001100","10011101100","10011100110","11001110010","11001011100",
  "11001001110","11011100100","11001110100","11101101110","11101001100",
  "11100101100","11100100110","11101100100","11100110100","11100110010",
  "11011011000","11011000110","11000110110","10100011000","10001011000",
  "10001000110","10110001000","10001101000","10001100010","11010001000",
  "11000101000","11000100010","10110111000","10110001110","10001101110",
  "10111011000","10111000110","10001110110","11101110110","11010001110",
  "11000101110","11011101000","11011100010","11011101110","11101011000",
  "11101000110","11100010110","11101101000","11101100010","11100011010",
  "11101111010","11001000010","11110001010","10100110000","10100001100",
  "10010110000","10010000110","10000101100","10000100110","10110010000",
  "10110000100","10011010000","10011000010","10000110100","10000110010",
  "11000010010","11001010000","11110111010","11000010100","10001111010",
  "10100111100","10010111100","10010011110","10111100100","10011110100",
  "10011110010","11110100100","11110010100","11110010010","11011011110",
  "11011110110","11110110110","10101111000","10100011110","10001011110",
  "10111101000","10111100010","11110101000","11110100010","10111011110",
  "10111101110","11101011110","11110101110","11010000100","11010010000",
  "11010011100","11000111010","1100011101011"
];

const START_B = 104;
const STOP = 106;

function encodeCode128B(text) {
  if (!text || text.length === 0) return [];

  const values = [START_B];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code < 0 || code > 94) continue;
    values.push(code);
  }

  let checksum = values[0];
  for (let i = 1; i < values.length; i++) {
    checksum += values[i] * i;
  }
  checksum = checksum % 103;
  values.push(checksum);
  values.push(STOP);

  let bits = "";
  for (const val of values) {
    bits += CODE128B_PATTERNS[val];
  }

  const bars = [];
  for (let i = 0; i < bits.length; i++) {
    bars.push(bits[i] === "1");
  }
  return bars;
}

/* ── localStorage keys (persist forever) ── */
const LS_STUDENT_ID = "svit_idcard_student_id";
const LS_PHOTO = "svit_idcard_photo";

/* Map any department string from the ERP to the short ID-card form */
function parseDeptShort(raw) {
  if (!raw) return "";
  let d = raw.toUpperCase().trim();
  // Strip degree prefix
  d = d.replace(/^B\.?E\.?[\s-]*/i, "");

  // Short codes first (when ERP returns e.g. "CD", "CS")
  const SHORT = {
    "CS": "CSE", "CD": "CSE ( DS )", "EC": "ECE", "EE": "EEE",
    "ME": "MECH", "CV": "CIVIL", "IS": "ISE", "AI": "AI",
    "CI": "AI & ML", "CSE": "CSE",
  };
  if (SHORT[d]) return SHORT[d];

  // Full-name keyword matching
  if (/DATA\s*SCI/i.test(d))       return "CSE ( DS )";
  if (/AI\s*&?\s*ML|MACHINE/i.test(d)) return "AI & ML";
  if (/INFORMATION\s*SCI/i.test(d)) return "ISE";
  if (/COMPUTER\s*SCI/i.test(d))   return "CSE";
  if (/ELECTRO.*COMM/i.test(d))    return "ECE";
  if (/ELECTRICAL/i.test(d))       return "EEE";
  if (/MECHANICAL/i.test(d))       return "MECH";
  if (/CIVIL/i.test(d))            return "CIVIL";
  if (/ARTIFICIAL/i.test(d))       return "AI";

  // Fallback: just return the stripped string, capped at ~15 chars
  return d.length > 15 ? d.substring(0, 15) + "…" : d;
}

export default function IDCardPage() {
  const [profile, setProfile] = useState(null);
  const [photo, setPhoto] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  // Persisted state — loaded from localStorage
  const [savedStudentId, setSavedStudentId] = useState("");
  const [savedPhoto, setSavedPhoto] = useState("");
  const [idInput, setIdInput] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isSecured, setIsSecured] = useState(false);
  const [isApk, setIsApk] = useState(false);

  // Load persisted values on mount
  useEffect(() => {
    try {
      const id = localStorage.getItem(LS_STUDENT_ID);
      if (id) setSavedStudentId(id);
      const ph = localStorage.getItem(LS_PHOTO);
      if (ph) setSavedPhoto(ph);

      // Check if inside Android WebView container (APK wrapper)
      const ua = navigator.userAgent || "";
      const isWebView = /wv|Android.*Version\/[0-9.]+/i.test(ua);
      setIsApk(isWebView);
    } catch {}
  }, []);

  // Notify Android WebView wrapper to enable/disable FLAG_SECURE specifically for this page
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.Android && typeof window.Android.setSecureScreen === "function") {
        window.Android.setSecureScreen(true);
      }
    } catch (e) {
      console.error("Failed to enable native secure screen:", e);
    }

    return () => {
      try {
        if (typeof window !== "undefined" && window.Android && typeof window.Android.setSecureScreen === "function") {
          window.Android.setSecureScreen(false);
        }
      } catch (e) {
        console.error("Failed to disable native secure screen:", e);
      }
    };
  }, []);

  // Screenshot and Print protection listeners
  useEffect(() => {
    const handleBlur = () => setIsSecured(true);
    const handleFocus = () => setIsSecured(false);
    const handleVisibility = () => {
      if (document.hidden) {
        setIsSecured(true);
      } else {
        setIsSecured(false);
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    // Block save, print, and copy keyboard combinations
    const handleKeyDown = (e) => {
      // Block PrintScreen key
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText(""); // Clear clipboard immediately
        setIsSecured(true);
        e.preventDefault();
      }
      // Block Ctrl+P (Print), Ctrl+S (Save), and Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "s" || e.key === "u")) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Fetch profile + ERP photo
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("profile_data");
      if (cached) {
        setProfile(JSON.parse(cached));
        setLoading(false);
      }
    } catch {}

    const fetchData = async () => {
      try {
        const [profileRes, photoRes] = await Promise.all([
          fetch("/api/student/profile"),
          fetch("/api/student/photo"),
        ]);

        if (profileRes.status === 401) {
          router.push("/");
          return;
        }

        const profileJson = await profileRes.json();
        if (profileJson.success) {
          setProfile(profileJson.data);
          try {
            sessionStorage.setItem("profile_data", JSON.stringify(profileJson.data));
          } catch {}
        } else {
          setError(profileJson.error || "Failed to load profile.");
        }

        if (photoRes.ok) {
          const photoJson = await photoRes.json();
          if (photoJson.photo) {
            setPhoto(photoJson.photo);
          }
        }
      } catch (err) {
        setError("Could not connect to the ERP server.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Save Student ID permanently
  const handleSaveStudentId = useCallback(() => {
    if (!idInput.trim()) return;
    const val = idInput.trim().toUpperCase();
    try {
      localStorage.setItem(LS_STUDENT_ID, val);
    } catch {}
    setSavedStudentId(val);
    setIdInput("");
    setShowConfirm(true);
    // Auto-dismiss confirm after 4s
    setTimeout(() => setShowConfirm(false), 4000);
  }, [idInput]);

  // Upload & persist photo permanently
  const handlePhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      try {
        localStorage.setItem(LS_PHOTO, dataUrl);
      } catch {}
      setSavedPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  // Which photo to display: saved (localStorage) > ERP-fetched
  const displayPhoto = savedPhoto || photo;

  // Has the student already locked their ID?
  const idLocked = !!savedStudentId;

  // Department display
  const deptDisplay = parseDeptShort(profile?.department || "");

  // Barcode text: encode student ID if set, otherwise USN
  const barcodeText = savedStudentId || profile?.usn || "SVIT2025";

  if (loading) {
    return (
      <div className="center-state">
        <div className="loader" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="center-state">
        <div className="auth-card" style={{ maxWidth: 460, textAlign: "center" }}>
          <p className="eyebrow">ID Card</p>
          <h1 className="title">Could not load data</h1>
          <p className="subtle" style={{ marginTop: 12 }}>{error}</p>
          <button onClick={() => router.push("/")} className="button" style={{ marginTop: 22 }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell native-screen fade-in" style={{ paddingBottom: "120px" }}>

      {/* ── Student ID Input (only shown if not yet saved) ── */}
      {!idLocked && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head compact">
            <div>
              <h2 className="panel-title">Enter Student ID</h2>
              <p className="subtle" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                This is a one-time entry. It cannot be changed later.
              </p>
            </div>
            <IdCard size={22} color="var(--primary)" />
          </div>
          <input
            type="text"
            className="input"
            placeholder="e.g. 25DS501"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value.toUpperCase())}
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "0.05em",
              color: "var(--ink)",
              background: "var(--surface)",
              caretColor: "var(--primary)",
            }}
          />
          <button
            className="button full"
            disabled={!idInput.trim()}
            onClick={handleSaveStudentId}
            style={{ marginTop: 12 }}
          >
            Save Student ID
          </button>
        </section>
      )}

      {/* ── Success confirmation toast ── */}
      {showConfirm && (
        <div
          className="fade-in"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            marginBottom: 16,
            background: "var(--success-soft)",
            border: "1px solid rgba(33,131,92,0.2)",
            borderRadius: "var(--radius)",
          }}
        >
          <CheckCircle2 size={20} color="var(--success)" />
          <div>
            <strong style={{ display: "block", fontSize: "0.9rem", color: "var(--success)" }}>
              Student ID saved!
            </strong>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              If you made a mistake, please contact the developer to change it.
            </span>
          </div>
        </div>
      )}

      {/* ── Locked ID notice ── */}
      {idLocked && !showConfirm && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            marginBottom: 16,
            background: "var(--warning-soft)",
            border: "1px solid rgba(167,105,19,0.15)",
            borderRadius: "var(--radius)",
          }}
        >
          <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.4 }}>
            Student ID is locked as <strong style={{ color: "var(--ink)" }}>{savedStudentId}</strong>.
            To change it, contact the developer.
          </span>
        </div>
      )}


      {/* ══════════════════════════════════════
         ID CARD PREVIEW
         ══════════════════════════════════════ */}
      <div className="idcard-container">
        <div className="idcard" ref={cardRef} style={{ filter: isSecured ? "blur(28px)" : "none", transition: "filter 0.15s ease", pointerEvents: isSecured ? "none" : "auto" }}>
          {/* Red vertical strip on left */}
          <div className="idcard-left-strip">
            <span className="idcard-college-name-vertical">
              SAI VIDYA INSTITUTE OF TECHNOLOGY
            </span>
          </div>

          {/* Main card content */}
          <div className="idcard-body">
            {/* Photo */}
            <div className="idcard-photo-frame">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Student Photo" className="idcard-photo-img" />
              ) : (
                <div className="idcard-photo-placeholder">
                  <Camera size={28} color="rgba(255,255,255,0.4)" />
                  <span>No Photo</span>
                </div>
              )}
            </div>

            {/* Real Code 128 Barcode — below photo */}
            <div className="idcard-barcode-svg">
              <Barcode
                value={barcodeText}
                format="CODE128"
                displayValue={false}
                background="transparent"
                lineColor="#000"
                height={44}
                width={2.0}
                margin={0}
              />
            </div>

            {/* Student Name */}
            <h2 className="idcard-name">{profile?.name || "STUDENT NAME"}</h2>

            {/* Details area with watermark behind */}
            <div className="idcard-details-wrapper">
              {/* Faded SVIT logo watermark — centered behind details */}
              <img
                src="/svit-logo-v3.png"
                alt=""
                className="idcard-watermark"
                aria-hidden="true"
              />

              <div className="idcard-details">
                <div className="idcard-detail-row">
                  <span className="idcard-label">Student ID</span>
                  <span className="idcard-separator">:</span>
                  <span className="idcard-value idcard-value-large">
                    {savedStudentId || "—"}
                  </span>
                </div>
                <div className="idcard-detail-row">
                  <span className="idcard-label">Course</span>
                  <span className="idcard-separator">:</span>
                  <span className="idcard-value idcard-value-bold">BE</span>
                </div>
                <div className="idcard-detail-row">
                  <span className="idcard-label">Dept.</span>
                  <span className="idcard-separator">:</span>
                  <span className="idcard-value idcard-value-bold">{deptDisplay || "—"}</span>
                </div>
                <div className="idcard-detail-row">
                  <span className="idcard-label">USN</span>
                  <span className="idcard-separator">:</span>
                  <span className="idcard-value idcard-value-bold">{profile?.usn || "—"}</span>
                </div>
              </div>
            </div>

            {/* Principal Signature + Label */}
            <div className="idcard-footer">
              <div className="idcard-seal-footer">
                <span className="idcard-svit-text">SVIT</span>
              </div>
              <div className="idcard-principal">
                <img
                  src="/principal-sign.svg"
                  alt="Principal Signature"
                  className="idcard-signature-img"
                />
                <span>Principal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          style={{ display: "none" }}
        />
        <button
          className="button secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{ fontSize: "0.85rem" }}
        >
          <Camera size={16} /> {displayPhoto ? "Change Photo" : "Upload Photo"}
        </button>
        <button
          className="button"
          onClick={() => setShowFullscreen(true)}
          style={{ fontSize: "0.85rem" }}
        >
          <Maximize2 size={16} /> View Full Screen
        </button>
      </div>

      {/* ── APK Active Protection Badge OR Browser Warning & Download Banner ── */}
      <div style={{ maxWidth: 360, margin: "16px auto 0", padding: "0 14px" }}>
        {isApk ? (
          <div className="idcard-secure-badge-apk">
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Hardware Screenshot Protection Active</span>
          </div>
        ) : (
          <div className="idcard-apk-promo-banner">
            <div className="idcard-promo-icon-box">
              <ShieldCheck size={18} />
            </div>
            <div className="idcard-promo-body">
              <h3>🛡️ Secure & Private</h3>
              <p>
                Your digital ID and photo are stored <strong>strictly locally</strong> on your device. We do not store or track your identity data on any server.
              </p>
              <p style={{ marginTop: 6 }}>
                For enhanced privacy, download the official app to enable <strong>hardware-level screenshot protection</strong>!
              </p>
              <a
                href="/svit-erp.apk"
                download="svit-erp.apk"
                className="idcard-promo-download-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  padding: "8px 14px",
                  background: "#21835c",
                  color: "#ffffff",
                  borderRadius: "10px",
                  fontSize: "0.75rem",
                  fontWeight: 900,
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(33, 131, 92, 0.2)",
                  transition: "transform 150ms ease"
                }}
              >
                📥 Download Official APK
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Info note */}
      <div style={{ textAlign: "center", marginTop: 12, padding: "0 16px" }}>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>
          Name, Department, and USN are auto-fetched from ERP. The barcode encodes your {savedStudentId ? "Student ID" : "USN"} in Code 128 format. We hope it's correct!
        </p>
      </div>

      {/* ══════════════════════════════════════
         FULLSCREEN ID CARD MODAL
         ══════════════════════════════════════ */}
      {showFullscreen && typeof document !== "undefined" && createPortal(
        <div className="idcard-fullscreen-overlay" onClick={() => setShowFullscreen(false)}>
          <div className="idcard-fullscreen-card" onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }} style={{ filter: isSecured ? "blur(28px)" : "none", transition: "filter 0.15s ease", pointerEvents: isSecured ? "none" : "auto" }}>
            {/* Red vertical strip */}
            <div className="idcard-left-strip">
              <span className="idcard-college-name-vertical">
                SAI VIDYA INSTITUTE OF TECHNOLOGY
              </span>
            </div>

            <div className="idcard-body">
              <div className="idcard-photo-frame">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="Student Photo" className="idcard-photo-img" />
                ) : (
                  <div className="idcard-photo-placeholder">
                    <Camera size={36} color="rgba(255,255,255,0.4)" />
                    <span>No Photo</span>
                  </div>
                )}
              </div>

              <div className="idcard-barcode-svg">
                <Barcode
                  value={barcodeText}
                  format="CODE128"
                  displayValue={false}
                  background="transparent"
                  lineColor="#000"
                  height={44}
                  width={2.0}
                  margin={0}
                />
              </div>

              <h2 className="idcard-name">{profile?.name || "STUDENT NAME"}</h2>

              <div className="idcard-details-wrapper">
                <img src="/svit-logo-v3.png" alt="" className="idcard-watermark" aria-hidden="true" />
                <div className="idcard-details">
                  <div className="idcard-detail-row">
                    <span className="idcard-label">Student ID</span>
                    <span className="idcard-separator">:</span>
                    <span className="idcard-value idcard-value-large">{savedStudentId || "—"}</span>
                  </div>
                  <div className="idcard-detail-row">
                    <span className="idcard-label">Course</span>
                    <span className="idcard-separator">:</span>
                    <span className="idcard-value idcard-value-bold">BE</span>
                  </div>
                  <div className="idcard-detail-row">
                    <span className="idcard-label">Dept.</span>
                    <span className="idcard-separator">:</span>
                    <span className="idcard-value idcard-value-bold">{deptDisplay || "—"}</span>
                  </div>
                  <div className="idcard-detail-row">
                    <span className="idcard-label">USN</span>
                    <span className="idcard-separator">:</span>
                    <span className="idcard-value idcard-value-bold">{profile?.usn || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="idcard-footer">
                <div className="idcard-seal-footer">
                  <span className="idcard-svit-text">SVIT</span>
                </div>
                <div className="idcard-principal">
                  <img src="/principal-sign.svg" alt="Principal Signature" className="idcard-signature-img" />
                  <span>Principal</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
