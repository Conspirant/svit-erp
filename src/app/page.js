"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  // Clear cached data from previous session
  useEffect(() => {
    try {
      sessionStorage.removeItem('dashboard_data');
      sessionStorage.removeItem('events_data');
      sessionStorage.removeItem('profile_data');
    } catch {}
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usn, dob }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("Could not connect to the ERP server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div>
          <Image className="auth-logo" src="/svit-logo.jpg" alt="SVIT logo" width={220} height={220} priority />
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.72)" }}>
            SVIT student ERP
          </p>
          <h1>SVIT ERP Proxy</h1>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.7, marginTop: 18, fontWeight: 500 }}>
            A user-friendly SVIT ERP proxy designed to simplify your academic life with a bunk calculator and a student marketplace to help you earn while you learn.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card fade-in">
          <p className="eyebrow">Welcome back</p>
          <h2 className="title">Sign in</h2>
          <p className="subtle" style={{ marginTop: 10 }}>
            Enter your USN and date of birth to log in.
          </p>

          {error && <div className="notice error">{error}</div>}

          <form onSubmit={handleLogin} className="form-stack">
            <div className="field">
              <label htmlFor="usn">USN</label>
              <input
                id="usn"
                type="text"
                className="input"
                placeholder="e.g. 1VA25CS001"
                autoComplete="username"
                value={usn}
                onChange={(e) => setUsn(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="field">
              <label>Password (Date of birth)</label>
              <div className="dob-mode-toggle">
                <button
                  type="button"
                  className={`dob-toggle-btn ${mode === "dropdown" ? "active" : ""}`}
                  onClick={() => setMode("dropdown")}
                >
                  Dropdown
                </button>
                <button
                  type="button"
                  className={`dob-toggle-btn ${mode === "type" ? "active" : ""}`}
                  onClick={() => setMode("type")}
                >
                  Type it
                </button>
              </div>

              {mode === "dropdown" ? (
                <div className="dob-dropdowns">
                  <select
                    id="dob-dd"
                    className="input dob-select"
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
                    id="dob-mm"
                    className="input dob-select"
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
                    id="dob-yyyy"
                    className="input dob-select"
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
                  id="dob"
                  type="password"
                  className="input"
                  autoComplete="current-password"
                  placeholder="YYYY-MM-DD or DD-MM-YYYY"
                  value={dobText}
                  onChange={(e) => setDobText(e.target.value)}
                  required={mode === "type"}
                />
              )}
            </div>

            <button type="submit" className="button full" disabled={loading}>
              {loading ? <span className="loader" aria-label="Signing in" /> : "Sign in"}
            </button>
          </form>

          <div className="auth-footer">
            <Link href="/forgot-password" style={{ color: "var(--primary)", fontWeight: 800 }}>
              Forgot password?
            </Link>
            <span className="subtle" style={{ fontSize: "0.82rem" }}>
              Secure session · this browser only
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
