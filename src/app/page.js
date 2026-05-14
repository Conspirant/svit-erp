"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiJson, clearClientSession } from "@/lib/clientApi";

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
        </div>

        {/* Footer hint */}
        <p className="app-login-hint">Login with your SVIT ERP credentials</p>
      </div>
    </main>
  );
}
