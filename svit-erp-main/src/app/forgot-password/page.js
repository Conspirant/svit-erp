"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [lastFourDigit, setLastFourDigit] = useState("");
  const [step, setStep] = useState(1);
  const [firstSixDigit, setFirstSixDigit] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [queued, setQueued] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setQueued(false);

    try {
      const payload =
        step === 1
          ? { email, step: 1 }
          : { email, step: 2, lastFourDigit, firstSixDigit, username };

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.queued) {
          setQueued(true);
          setMessage(data.message || "Your recovery request was received.");
          setStep(3);
        } else if (data.requireVerification) {
          setFirstSixDigit(data.firstSixDigit);
          setUsername(data.username);
          setStep(2);
          setMessage("Email verified. Complete mobile verification to continue.");
        } else {
          setMessage(data.message || "Credentials have been sent.");
          if (step === 2) setStep(3);
        }
      } else {
        setError(data.error || "Failed to process request.");
      }
    } catch (err) {
      setError("Could not contact the ERP server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.72)" }}>
            Account recovery
          </p>
          <h1>Recover access without fighting the old portal.</h1>
          <p>
            We pass the same recovery details to the ERP and keep the process
            focused on the next step you need to complete.
          </p>
        </div>
        <p style={{ fontSize: "0.9rem" }}>Use the email and phone number linked to your student profile.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card fade-in">
          <p className="eyebrow">Step {Math.min(step, 2)} of 2</p>
          <h2 className="title">
            {step === 2 ? "Verify mobile" : step === 3 ? queued ? "Request received" : "Check your messages" : "Reset password"}
          </h2>
          <p className="subtle" style={{ marginTop: 10 }}>
            {step === 2
              ? "Confirm the phone number connected to your ERP account."
              : step === 3
                ? queued
                  ? "You can use this recovery page anytime. We keep the experience inside this app even when the ERP limits processing."
                  : "If the details matched, the ERP has sent your credentials."
                : "Enter your registered email ID to begin account recovery."}
          </p>

          {error && <div className="notice error">{error}</div>}
          {message && <div className="notice success">{message}</div>}

          {step !== 3 && (
            <form onSubmit={handleReset} className="form-stack">
              <div className="field">
                <label htmlFor="email">Email ID</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="student@example.com"
                  autoComplete="email"
                  value={email}
                  disabled={step === 2}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {step === 2 && (
                <div className="field">
                  <label htmlFor="phone">
                    Last four digits of {firstSixDigit}XXXX
                  </label>
                  <input
                    id="phone"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength="4"
                    className="input"
                    placeholder="1234"
                    value={lastFourDigit}
                    onChange={(e) => setLastFourDigit(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              )}

              <button type="submit" className="button full" disabled={loading}>
                {loading ? <span className="loader" aria-label="Processing" /> : step === 1 ? "Continue" : "Verify"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 24 }}>
            <Link href="/" style={{ color: "var(--primary)", fontWeight: 800 }}>
              Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
