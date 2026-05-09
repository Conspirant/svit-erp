"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const EXAM_PERIODS = [
  { value: "ia1", label: "IA 1", date: "2026-04-27", target: 85 },
  { value: "ia2", label: "IA 2", date: "2026-06-08", target: 85 },
  { value: "see", label: "SEE", date: "2026-07-15", target: 75 },
  { value: "overall", label: "Overall", date: "", target: 85 },
];

const TARGET_PRESETS = [75, 80, 85, 90];

function calcBunkable(attended, total, target) {
  if (total === 0 || target <= 0 || target > 100) return null;
  const current = (attended / total) * 100;
  // How many consecutive bunks you can afford: (attended / (total + x)) >= target/100
  // x = floor(attended * 100 / target - total)
  const maxBunks = Math.floor((attended * 100) / target - total);
  // How many you need to attend in a row: ((attended + y) / (total + y)) >= target/100
  // y = ceil((target * total - attended * 100) / (100 - target))
  let needToAttend = 0;
  if (current < target) {
    needToAttend = Math.ceil((target * total - attended * 100) / (100 - target));
    if (needToAttend < 0) needToAttend = 0;
  }
  return {
    current: Math.round(current * 100) / 100,
    bunkable: Math.max(0, maxBunks),
    needToAttend,
    attended,
    total,
    target,
  };
}

export default function BunkCalculator() {
  const router = useRouter();
  const [attended, setAttended] = useState("");
  const [total, setTotal] = useState("");
  const [target, setTarget] = useState(85);
  const [customTarget, setCustomTarget] = useState("");
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [period, setPeriod] = useState("overall");
  const [date, setDate] = useState("");
  const [history, setHistory] = useState([]);

  const effectiveTarget = useCustomTarget ? (Number(customTarget) || 0) : target;

  const handlePeriodChange = (p) => {
    setPeriod(p.value);
    if (p.date) setDate(p.date);
    if (p.target && !useCustomTarget) setTarget(p.target);
  };

  const result = useMemo(() => {
    const a = parseInt(attended, 10);
    const t = parseInt(total, 10);
    if (isNaN(a) || isNaN(t) || t === 0) return null;
    if (a > t) return null; // Can't attend more than total
    return calcBunkable(a, t, effectiveTarget);
  }, [attended, total, effectiveTarget]);

  const handleSave = () => {
    if (!result) return;
    const entry = {
      ...result,
      period: EXAM_PERIODS.find(p => p.value === period)?.label || period,
      date: date || new Date().toLocaleDateString("en-IN"),
      id: Date.now(),
    };
    setHistory(prev => [entry, ...prev].slice(0, 10));
  };

  const clearHistory = () => setHistory([]);

  return (
    <main className="page-shell fade-in">
      <header className="app-header">
        <div>
          <p className="eyebrow">Attendance tool</p>
          <h1 className="title">Bunk Calculator</h1>
        </div>
        <button onClick={() => router.push("/")} className="button secondary">
          Logout
        </button>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        <Link className="tab" href="/dashboard">Overview</Link>
        <Link className="tab" href="/dashboard/events">Calendar</Link>
        <Link className="tab" href="/dashboard/timetable">Timetable</Link>
        <Link className="tab" href="/dashboard/info">Profile</Link>
        <Link className="tab active" href="/dashboard/bunk">Bunk Calc</Link>
        <Link className="tab" href="/dashboard/dev">Dev Note</Link>
      </nav>

      <div className="bunk-layout">
        {/* Calculator panel */}
        <section className="panel bunk-panel">
          <div className="panel-head compact">
            <h2 className="panel-title">What-if calculator</h2>
          </div>

          <div className="notice" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(186,100,41,0.18)", fontSize: "0.82rem", lineHeight: 1.5, marginBottom: 20 }}>
            <strong>Note:</strong> This manual calculator is specifically for those subjects whose attendance hasn{"\u2019"}t been added or updated to the official ERP portal yet. Use this to track your own "hidden" attendance count!
          </div>

          <div className="bunk-form">
            {/* Exam period selector */}
            <div className="field">
              <label>Calculation for</label>
              <div className="bunk-period-row">
                {EXAM_PERIODS.map(ep => (
                  <button
                    key={ep.value}
                    type="button"
                    className={`bunk-period-btn ${period === ep.value ? "active" : ""}`}
                    onClick={() => handlePeriodChange(ep)}
                  >
                    {ep.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Attended / Total */}
            <div className="bunk-input-row">
              <div className="field">
                <label htmlFor="bunk-attended">Classes attended</label>
                <input
                  id="bunk-attended"
                  type="number"
                  className="input"
                  inputMode="numeric"
                  placeholder="e.g. 42"
                  min="0"
                  value={attended}
                  onChange={e => setAttended(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="bunk-total">Total classes</label>
                <input
                  id="bunk-total"
                  type="number"
                  className="input"
                  inputMode="numeric"
                  placeholder="e.g. 50"
                  min="1"
                  value={total}
                  onChange={e => setTotal(e.target.value)}
                />
              </div>
            </div>

            {/* Target percentage */}
            <div className="field">
              <label>Target attendance %</label>
              <div className="bunk-target-row">
                {TARGET_PRESETS.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`bunk-target-btn ${!useCustomTarget && target === t ? "active" : ""}`}
                    onClick={() => { setTarget(t); setUseCustomTarget(false); }}
                  >
                    {t}%
                  </button>
                ))}
                <input
                  type="number"
                  className="input bunk-target-input"
                  inputMode="numeric"
                  placeholder="Custom"
                  min="1"
                  max="100"
                  value={customTarget}
                  onFocus={() => setUseCustomTarget(true)}
                  onChange={e => { setCustomTarget(e.target.value); setUseCustomTarget(true); }}
                />
              </div>
            </div>

            {/* Date */}
            <div className="field">
              <label htmlFor="bunk-date">Date (optional)</label>
              <input
                id="bunk-date"
                type="date"
                className="input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bunk-result">
              <div className="bunk-result-header">
                <div>
                  <span className="eyebrow">Current attendance</span>
                  <span className={`bunk-current-pct ${result.current >= effectiveTarget ? "safe" : "risk"}`}>
                    {result.current}%
                  </span>
                </div>
                <span className="badge" style={{ background: "var(--surface-soft)", color: "var(--muted)", fontSize: "0.76rem" }}>
                  {result.attended} / {result.total}
                </span>
              </div>

              <div className="bunk-result-bar">
                <div
                  className="bunk-result-fill"
                  style={{ width: `${Math.min(100, result.current)}%` }}
                  data-safe={result.current >= effectiveTarget}
                />
                <div
                  className="bunk-result-marker"
                  style={{ left: `${Math.min(100, effectiveTarget)}%` }}
                  title={`Target: ${effectiveTarget}%`}
                />
              </div>

              <div className="bunk-verdict-grid">
                {result.current >= effectiveTarget ? (
                  <div className="bunk-verdict safe">
                    <span className="bunk-verdict-num">{result.bunkable}</span>
                    <span className="bunk-verdict-label">
                      class{result.bunkable !== 1 ? "es" : ""} you can bunk
                    </span>
                    <span className="bunk-verdict-sub">
                      and still stay at or above {effectiveTarget}%
                    </span>
                  </div>
                ) : (
                  <div className="bunk-verdict risk">
                    <span className="bunk-verdict-num">{result.needToAttend}</span>
                    <span className="bunk-verdict-label">
                      class{result.needToAttend !== 1 ? "es" : ""} you must attend
                    </span>
                    <span className="bunk-verdict-sub">
                      in a row to reach {effectiveTarget}%
                    </span>
                  </div>
                )}
              </div>

              <button className="button full" onClick={handleSave} style={{ marginTop: 12 }}>
                Save to history
              </button>
            </div>
          )}
        </section>

        {/* History panel */}
        <section className="panel bunk-history-panel">
          <div className="panel-head compact">
            <h2 className="panel-title">Calculation history</h2>
            {history.length > 0 && (
              <button className="badge" style={{ cursor: "pointer", background: "var(--danger-soft)", color: "var(--danger)" }} onClick={clearHistory}>
                Clear
              </button>
            )}
          </div>

          {history.length > 0 ? (
            <div className="bunk-history-list">
              {history.map(h => (
                <div className="bunk-history-item" key={h.id}>
                  <div className="bunk-history-top">
                    <span className="badge" style={{ background: "var(--surface-soft)" }}>{h.period}</span>
                    <span className="subtle" style={{ fontSize: "0.76rem" }}>{h.date}</span>
                  </div>
                  <div className="bunk-history-stats">
                    <span><strong>{h.attended}</strong>/{h.total}</span>
                    <span className={h.current >= h.target ? "safe-text" : "risk-text"}>
                      {h.current}%
                    </span>
                    <span className="subtle">
                      {h.current >= h.target
                        ? `Can bunk ${h.bunkable}`
                        : `Need ${h.needToAttend} more`
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="subtle" style={{ fontSize: "0.84rem" }}>
              No calculations saved yet. Use the calculator and hit "Save to history" to track your attendance scenarios.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
