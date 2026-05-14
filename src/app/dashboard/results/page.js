"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export default function ResultsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(0);
  const [semester, setSemester] = useState("current");

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      const cached = (() => {
        try { return JSON.parse(sessionStorage.getItem("dashboard_data") || "null"); } catch { return null; }
      })();
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    });

    apiFetch("/api/student/dashboard")
      .then((json) => {
        if (!alive) return;
        setData(json.data);
        try { sessionStorage.setItem("dashboard_data", JSON.stringify(json.data)); } catch { }
      })
      .catch((err) => alive && setError(err.message || "Could not load results."))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, []);

  const cie = useMemo(() => data?.cie || [], [data]);

  if (loading) return <div className="center-state"><div className="loader" /></div>;
  if (error) return <div className="center-state"><div className="notice error">{error}</div></div>;

  return (
    <main className="page-shell fade-in native-screen">
      <section className="native-page-head">
        <div>
          <h1>Results</h1>
          <p>Provisional</p>
        </div>
      </section>

      <div className="native-segment">
        <button className="active" type="button">ISA</button>
        <button type="button">ESA</button>
      </div>

      <div className="native-chip-row">
        <button className={semester === "current" ? "active" : ""} type="button" onClick={() => setSemester("current")}>
          Sem-{data?.semester || "Current"}
        </button>
        <button className={semester === "previous" ? "active" : ""} type="button" onClick={() => setSemester("previous")}>
          Previous
        </button>
      </div>

      <section className="native-list">
        {cie.length ? cie.map((item, index) => {
          const marks = toNumber(item.marks);
          const isOpen = expanded === index;
          return (
            <article className={`native-result-card${isOpen ? " open" : ""}`} key={`${item.course}-${index}`}>
              <button type="button" className="native-result-top" onClick={() => setExpanded(isOpen ? -1 : index)}>
                <span className="result-score">{marks || "-"}</span>
                <span className="result-copy">
                  <strong>{item.courseName || item.course}</strong>
                  <small>{item.course}{item.courseName ? " · Internal marks" : ""}</small>
                </span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {isOpen && (
                <div className="result-breakdown">
                  <p>Breakdown</p>
                  <div><span>Final ISA</span><strong>{marks || "-"} / -</strong></div>
                  <div><span>Published score</span><strong className="safe-text">{marks || "-"} marks</strong></div>
                  <div><span>Source</span><strong>SVIT ERP</strong></div>
                </div>
              )}
            </article>
          );
        }) : <p className="subtle">No internal marks data found.</p>}
      </section>
    </main>
  );
}
