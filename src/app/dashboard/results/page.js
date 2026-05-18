"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatMark = (mark) => {
  if (!mark || mark.obtained === null) return "-";
  if (mark.max !== null) return `${mark.obtained}/${mark.max}`;
  return `${mark.obtained}`;
};

const hasMark = (mark) => mark?.obtained !== null && mark?.obtained !== undefined;

const getActivityMarks = (breakdown) => {
  const first = hasMark(breakdown?.assign1)
    ? { label: "Assign 1", mark: breakdown.assign1 }
    : { label: "Lab 1", mark: breakdown?.lab1 };
  const second = hasMark(breakdown?.assign2)
    ? { label: "Assign 2", mark: breakdown.assign2 }
    : { label: "Lab 2", mark: breakdown?.lab2 };

  return [first, second];
};

const getPrimaryMark = (item) => {
  const finalIA = item?.breakdown?.finalIA;
  if (hasMark(finalIA)) return finalIA;
  if (item?.marks !== null && item?.marks !== undefined) {
    return { obtained: toNumber(item.marks), max: item.maxMarks ?? null };
  }
  return { obtained: null, max: null };
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
          const primaryMark = getPrimaryMark(item);
          const bd = item.breakdown;
          const isOpen = expanded === index;
          const activityMarks = getActivityMarks(bd);
          const hasBreakdown = bd && (hasMark(bd.ia1) || hasMark(bd.ia2) || hasMark(bd.lab1) || hasMark(bd.lab2) || hasMark(bd.assign1) || hasMark(bd.assign2) || hasMark(bd.finalIA));

          return (
            <article className={`native-result-card${isOpen ? " open" : ""}`} key={`${item.course}-${index}`}>
              <button type="button" className="native-result-top" onClick={() => setExpanded(isOpen ? -1 : index)}>
                <span className="result-score">{hasMark(primaryMark) ? primaryMark.obtained : "-"}</span>
                <span className="result-copy">
                  <strong>{item.courseName || item.course}</strong>
                  <small>{item.course}{item.courseName ? " · Internal marks" : ""}</small>
                </span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {isOpen && (
                <div className="result-breakdown">
                  <p>Breakdown</p>

                  {hasBreakdown ? (
                    <>
                      {/* Marks grid showing IA1, IA2, Lab1, Lab2, Final IA */}
                      <div className="result-marks-grid">
                        <div className="result-mark-cell">
                          <span className="result-mark-label">IA1</span>
                          <span className={`result-mark-value${bd.ia1?.obtained !== null ? "" : " empty"}`}>
                            {formatMark(bd.ia1)}
                          </span>
                        </div>
                        <div className="result-mark-cell">
                          <span className="result-mark-label">IA2</span>
                          <span className={`result-mark-value${bd.ia2?.obtained !== null ? "" : " empty"}`}>
                            {formatMark(bd.ia2)}
                          </span>
                        </div>
                        <div className="result-mark-cell">
                          <span className="result-mark-label">{activityMarks[0].label}</span>
                          <span className={`result-mark-value${hasMark(activityMarks[0].mark) ? "" : " empty"}`}>
                            {formatMark(activityMarks[0].mark)}
                          </span>
                        </div>
                        <div className="result-mark-cell">
                          <span className="result-mark-label">{activityMarks[1].label}</span>
                          <span className={`result-mark-value${hasMark(activityMarks[1].mark) ? "" : " empty"}`}>
                            {formatMark(activityMarks[1].mark)}
                          </span>
                        </div>
                        <div className="result-mark-cell highlight">
                          <span className="result-mark-label">Final IA</span>
                          <span className={`result-mark-value${bd.finalIA?.obtained !== null ? "" : " empty"}`}>
                            {formatMark(bd.finalIA)}
                          </span>
                        </div>
                      </div>

                      {primaryMark.max !== null && primaryMark.max !== undefined && (
                        <div className="result-attendance-row">
                          <span>Max marks</span>
                          <strong>{primaryMark.max}</strong>
                        </div>
                      )}

                      {bd.attendance && (
                        <div className="result-attendance-row">
                          <span>Attendance</span>
                          <strong className={
                            parseFloat(bd.attendance) >= 75 ? "safe-text" : "danger-text"
                          }>{bd.attendance}</strong>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div><span>Final ISA</span><strong>{formatMark(primaryMark)}</strong></div>
                      {primaryMark.max !== null && primaryMark.max !== undefined && (
                        <div><span>Max marks</span><strong>{primaryMark.max}</strong></div>
                      )}
                      <div><span>Published score</span><strong className="safe-text">{hasMark(primaryMark) ? `${primaryMark.obtained} marks` : "-"}</strong></div>
                    </>
                  )}
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
