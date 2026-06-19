"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiJson, clearClientSession } from "@/lib/clientApi";
import { Mail, X, CheckCircle2, AlertCircle } from "lucide-react";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  { value: "01", label: "Jan" }, { value: "02", label: "Feb" }, { value: "03", label: "Mar" },
  { value: "04", label: "Apr" }, { value: "05", label: "May" }, { value: "06", label: "Jun" },
  { value: "07", label: "Jul" }, { value: "08", label: "Aug" }, { value: "09", label: "Sep" },
  { value: "10", label: "Oct" }, { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
];
// Reasonable range: 1955-2026 (same as the original ERP dropdown)
const YEARS = [];
for (let y = 2026; y >= 1955; y--) YEARS.push(String(y));

export default function Home() {
  const [usn, setUsn] = useState("");
  const [mode, setMode] = useState("dropdown");
  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [dobText, setDobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhoneDigits, setForgotPhoneDigits] = useState("");
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState("XXXXXXXXXX");
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: mobile
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState(null); // 'success' | 'error'
  const [forgotErrorMessage, setForgotErrorMessage] = useState("");
  const [forgotFirstSixDigit, setForgotFirstSixDigit] = useState("");
  const [forgotErpUsername, setForgotErpUsername] = useState("");
  const [forgotCookies, setForgotCookies] = useState("");
  const [forgotHiddenFields, setForgotHiddenFields] = useState(null);
  const router = useRouter();

  // Clear cached data from previous session
  useEffect(() => {
    try {
      clearClientSession();
    } catch { }
  }, []);

  const getDob = useCallback(() => {
    if (mode === "dropdown") {
      if (!dd || !mm || !yyyy) return "";
      return `${yyyy}-${mm}-${dd}`;
    }
    return dobText.trim();
  }, [mode, dd, mm, yyyy, dobText]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const dob = getDob();
    if (!dob) {
      setError("Please select or enter your date of birth.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await apiJson("/api/auth/login", { username: usn, dob }, { retries: 0, redirectOnUnauthorized: false });
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Could not connect to the ERP server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotErrorMessage("");
    
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, mode: 1 }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setForgotMaskedPhone(data.maskedPhone || "");
        setForgotFirstSixDigit(data.firstSixDigit || "");
        setForgotErpUsername(data.erpUsername || "");
        setForgotStep(2);
      } else {
        setForgotErrorMessage(data.error || "The entered email ID is invalid.");
        setForgotStatus("error");
      }
    } catch (err) {
      setForgotErrorMessage("Connection error. Please try again.");
      setForgotStatus("error");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotStatus(null);
    setForgotErrorMessage("");
    
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: forgotEmail, 
          mode: 2, 
          phone: forgotPhoneDigits,
          firstSixDigit: forgotFirstSixDigit,
          erpUsername: forgotErpUsername
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setForgotStatus("success");
      } else {
        setForgotErrorMessage(data.error || "Verification failed. Please check the digits.");
        setForgotStatus("error");
      }
    } catch (err) {
      setForgotErrorMessage("Connection error. Please try again.");
      setForgotStatus("error");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <main className="app-login-screen">
      <div className="app-login-container fade-in">
        {/* Logo & Branding */}
        <div className="app-login-brand">
          <Image
            className="app-login-logo"
            src="/svit-logo-v3.png"
            alt="SVIT logo"
            width={120}
            height={120}
            priority
          />
          <h1 className="app-login-title" style={{ fontSize: "1.35rem", textAlign: "center", lineHeight: "1.2" }}>
            SAI VIDYA INSTITUTE OF TECHNOLOGY
          </h1>
          <div className="app-login-divider" />
          <p className="app-login-subtitle">Student ERP</p>
          <div 
            style={{ 
              marginTop: "12px", 
              padding: "6px 12px", 
              background: "rgba(52, 209, 120, 0.1)", 
              border: "1px solid rgba(52, 209, 120, 0.24)", 
              borderRadius: "20px", 
              fontSize: "0.72rem", 
              fontWeight: 800, 
              color: "#34d178", 
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              letterSpacing: "0.02em"
            }}
          >
            <span style={{ display: "inline-block", width: "6px", height: "6px", background: "#34d178", borderRadius: "50%" }} />
            UPDATED VTU SEE TIMETABLE FOR 2ND SEM STUDENTS
          </div>
        </div>

        {/* Login Form Card */}
        <div className="app-login-card">
          {/* USN Field */}
          <div className="app-login-field">
            <label className="app-login-label" htmlFor="login-usn">USN</label>
            <input
              id="login-usn"
              type="text"
              className="app-login-input"
              placeholder="e.g. 1VA25CS001"
              autoComplete="username"
              autoCapitalize="characters"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              required
            />
          </div>

          {/* Password (DOB) Field */}
          <div className="app-login-field">
            <label className="app-login-label">Password (Date of Birth)</label>

            {/* Mode Toggle */}
            <div className="app-login-dob-toggle">
              <button
                type="button"
                className={`app-login-toggle-btn ${mode === "dropdown" ? "active" : ""}`}
                onClick={() => setMode("dropdown")}
              >
                Dropdown
              </button>
              <button
                type="button"
                className={`app-login-toggle-btn ${mode === "type" ? "active" : ""}`}
                onClick={() => setMode("type")}
              >
                Type it
              </button>
            </div>

            {mode === "dropdown" ? (
              <div className="app-login-dob-row">
                <select
                  id="login-dd"
                  className="app-login-input app-login-select"
                  value={dd}
                  onChange={(e) => setDd(e.target.value)}
                  required={mode === "dropdown"}
                >
                  <option value="" disabled>Day</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  id="login-mm"
                  className="app-login-input app-login-select"
                  value={mm}
                  onChange={(e) => setMm(e.target.value)}
                  required={mode === "dropdown"}
                >
                  <option value="" disabled>Month</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  id="login-yyyy"
                  className="app-login-input app-login-select"
                  value={yyyy}
                  onChange={(e) => setYyyy(e.target.value)}
                  required={mode === "dropdown"}
                >
                  <option value="" disabled>Year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            ) : (
              <input
                id="login-dob"
                type="password"
                className="app-login-input"
                autoComplete="current-password"
                placeholder="YYYY-MM-DD or DD-MM-YYYY"
                value={dobText}
                onChange={(e) => setDobText(e.target.value)}
                required={mode === "type"}
              />
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="app-login-error">
              <span>⚠</span>
              <p>{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="button"
            className="app-login-btn"
            disabled={loading}
            onClick={handleLogin}
          >
            {loading ? <span className="app-login-spinner" aria-label="Signing in" /> : "Sign In"}
          </button>

          {/* Forgot Password Trigger */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button"
              onClick={() => { setShowForgotModal(true); setForgotStep(1); }}
              style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline' }}
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <p className="app-login-hint">Login with your SVIT ERP credentials</p>

        {/* Institutional Policies Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/privacy?tab=terms" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', transition: 'color 150ms ease' }} className="policy-footer-link">
            Terms & Conditions
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
          <Link href="/privacy?tab=privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', transition: 'color 150ms ease' }} className="policy-footer-link">
            Privacy Policy
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
          <Link href="/privacy?tab=refund" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', transition: 'color 150ms ease' }} className="policy-footer-link">
            Refund Policy
          </Link>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .policy-footer-link:hover {
            color: #ffffff !important;
          }
        `}} />
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="app-login-card fade-in" style={{ width: '100%', maxWidth: 400, position: 'relative', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={() => { setShowForgotModal(false); setForgotStatus(null); setForgotEmail(""); setForgotPhoneDigits(""); setForgotStep(1); }}
              style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', color: 'rgba(255,255,255,0.4)' }}
            >
              <X size={24} />
            </button>

            {!forgotStatus ? (
              forgotStep === 1 ? (
                <form onSubmit={handleEmailSubmit}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>Forgot Credentials?</h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>Enter the Email-Id for which you want to recover the password.</p>
                  
                  <div className="app-login-field" style={{ marginBottom: 24 }}>
                    <label className="app-login-label">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                      <input 
                        type="text" 
                        className="app-login-input" 
                        placeholder="Email-Id" 
                        style={{ paddingLeft: 44 }}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="app-login-btn" disabled={forgotLoading} style={{ background: '#fff', color: '#000' }}>
                    {forgotLoading ? <span className="app-login-spinner" style={{ borderTopColor: '#000' }} /> : "Next"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleFinalSubmit}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>Mobile verification</h3>
                  
                  <div className="app-login-field" style={{ marginBottom: 16 }}>
                    <label className="app-login-label">Enter your Email ID</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                      <input 
                        type="text" 
                        className="app-login-input" 
                        style={{ paddingLeft: 44 }}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="app-login-field" style={{ marginBottom: 24 }}>
                    <label className="app-login-label">Enter last four digit of your mobile number</label>
                    {forgotMaskedPhone && forgotMaskedPhone !== 'XXXXXXXXXX' && (
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: '#fff', letterSpacing: '0.15em' }}>
                        {forgotMaskedPhone}
                      </p>
                    )}
                    <input 
                      type="tel" 
                      className="app-login-input" 
                      placeholder="e.g. 1234" 
                      maxLength={4}
                      value={forgotPhoneDigits}
                      onChange={(e) => setForgotPhoneDigits(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                    />
                  </div>

                  <button type="submit" className="app-login-btn" disabled={forgotLoading} style={{ background: '#fff', color: '#000' }}>
                    {forgotLoading ? <span className="app-login-spinner" style={{ borderTopColor: '#000' }} /> : "Verify & Send"}
                  </button>
                  <button type="button" className="app-login-btn" style={{ marginTop: 12, background: 'rgba(255,255,255,0.05)', color: '#fff' }} onClick={() => { setForgotStep(1); setForgotStatus(null); }}>
                    Back
                  </button>
                </form>
              )
            ) : forgotStatus === "success" ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={56} color="#10b981" style={{ marginBottom: 16 }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>Success</h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Credentials were successfully sent to the registered email ID and mobile number.
                </p>
                <button 
                  className="app-login-btn" 
                  style={{ marginTop: 24, background: '#fff', color: '#000' }}
                  onClick={() => { setShowForgotModal(false); setForgotStatus(null); setForgotEmail(""); }}
                >
                  Ok
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <AlertCircle size={56} color="#ef4444" style={{ marginBottom: 16 }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: '#ef4444' }}>Error</h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  {forgotErrorMessage || "The entered email ID is invalid or not registered in our system."}
                </p>
                <button 
                  className="app-login-btn" 
                  style={{ marginTop: 24, background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                  onClick={() => { setForgotStatus(null); if (forgotStep === 2) setForgotStep(2); }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
