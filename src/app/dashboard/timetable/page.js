"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function parseCourse(raw) {
  if (!raw) return { code: '', name: '' };
  const dashIdx = raw.indexOf(' - ');
  if (dashIdx > 0 && dashIdx < 30) {
    return { code: raw.slice(0, dashIdx).trim(), name: raw.slice(dashIdx + 3).trim() };
  }
  const spaceMatch = raw.match(/^([A-Z0-9_]+(?:PHYCYCLE)?)\s+(.+)$/i);
  if (spaceMatch) return { code: spaceMatch[1], name: spaceMatch[2] };
  return { code: raw, name: '' };
}

export default function Timetable() {
  const [data, setData] = useState(null);
  const [nav, setNav] = useState({ prevWeek: null, nextWeek: null });
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const cache = useRef({});

  const fetchTimetable = useCallback(async (params = {}) => {
    const cacheKey = JSON.stringify(params);
    if (cache.current[cacheKey]) {
      setData(cache.current[cacheKey].data);
      setNav(cache.current[cacheKey].nav);
      setSwitching(false);
      return;
    }

    try {
      const qs = new URLSearchParams(params).toString();
      const url = `/api/student/timetable${qs ? '?' + qs : ''}`;
      const res = await fetch(url);

      if (res.status === 401) {
        router.push("/");
        return;
      }

      const json = await res.json();
      if (json.success) {
        const sorted = (json.data || []).sort((a, b) => {
          const ai = DAY_ORDER.indexOf(a.day);
          const bi = DAY_ORDER.indexOf(b.day);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
        setData(sorted);
        setNav(json.navigation || { prevWeek: null, nextWeek: null });
        cache.current[cacheKey] = { data: sorted, nav: json.navigation || {} };

        // Prefetch adjacent weeks logic...
        if (json.navigation?.prevWeek) {
          const prevParams = { type: 'prev', ...json.navigation.prevWeek };
          const prevKey = JSON.stringify(prevParams);
          if (!cache.current[prevKey]) {
            const prevQs = new URLSearchParams(prevParams).toString();
            fetch(`/api/student/timetable?${prevQs}`).then(r => r.json()).then(pj => {
              if (pj.success) {
                const ps = (pj.data || []).sort((a, b) => (DAY_ORDER.indexOf(a.day) ?? 99) - (DAY_ORDER.indexOf(b.day) ?? 99));
                cache.current[prevKey] = { data: ps, nav: pj.navigation || {} };
              }
            }).catch(() => { });
          }
        }
        if (json.navigation?.nextWeek) {
          const nextParams = { type: 'next', ...json.navigation.nextWeek };
          const nextKey = JSON.stringify(nextParams);
          if (!cache.current[nextKey]) {
            const nextQs = new URLSearchParams(nextParams).toString();
            fetch(`/api/student/timetable?${nextQs}`).then(r => r.json()).then(nj => {
              if (nj.success) {
                const ns = (nj.data || []).sort((a, b) => (DAY_ORDER.indexOf(a.day) ?? 99) - (DAY_ORDER.indexOf(b.day) ?? 99));
                cache.current[nextKey] = { data: ns, nav: nj.navigation || {} };
              }
            }).catch(() => { });
          }
        }
      } else {
        setError(json.error || "Failed to load timetable.");
      }
    } catch (err) {
      setError("Could not connect to the ERP server.");
    } finally {
      setLoading(false);
      setSwitching(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Today's date in DD-MM-YYYY format
  const todayDate = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  // Scroll to today when data is loaded
  useEffect(() => {
    if (data && data.length > 0 && !switching) {
      const todayEl = document.getElementById(`day-${todayDate}`);
      if (todayEl) {
        setTimeout(() => {
          todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [data, todayDate, switching]);

  const goToPrevWeek = () => {
    if (!nav.prevWeek) return;
    setSwitching(true);
    fetchTimetable({ type: 'prev', ...nav.prevWeek });
  };

  const goToNextWeek = () => {
    if (!nav.nextWeek) return;
    setSwitching(true);
    fetchTimetable({ type: 'next', ...nav.nextWeek });
  };

  if (loading) {
    return (
      <div className="center-state">
        <div className="loader" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-state">
        <div className="auth-card" style={{ maxWidth: 460, textAlign: "center" }}>
          <p className="eyebrow">Timetable unavailable</p>
          <h1 className="title">Could not load schedule</h1>
          <p className="subtle" style={{ marginTop: 12 }}>{error}</p>
          <button onClick={() => router.push("/")} className="button" style={{ marginTop: 22 }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell fade-in">
      <header className="app-header">
        <div>
          <p className="eyebrow">Class Schedule</p>
          <h1 className="title">Weekly Timetable</h1>
        </div>
        <button onClick={() => router.push("/")} className="button secondary">
          Logout
        </button>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        <Link className="tab" href="/dashboard">Overview</Link>
        <Link className="tab" href="/dashboard/marketplace">Marketplace</Link>
        <Link className="tab" href="/dashboard/events">Calendar</Link>
        <Link className="tab active" href="/dashboard/timetable">Timetable</Link>
        <Link className="tab" href="/dashboard/info">Profile</Link>
        <Link className="tab" href="/dashboard/bunk">Bunk Calc</Link>
        <Link className="tab" href="/dashboard/connect">Connect</Link>
      </nav>

      {/* Week navigation */}
      <div className="week-nav">
        <button
          className="week-nav-btn"
          onClick={goToPrevWeek}
          disabled={!nav.prevWeek || switching}
        >
          ‹ Previous Week
        </button>
        <button
          className="week-nav-btn"
          onClick={goToNextWeek}
          disabled={!nav.nextWeek || switching}
        >
          Next Week ›
        </button>
      </div>

      {switching && (
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
          <div className="loader" />
        </div>
      )}

      <section className="grid" style={{ opacity: switching ? 0.5 : 1 }}>
        {data && data.length > 0 ? (
          data.map((dayData, index) => (
            <article
              className="panel span-12"
              key={`${dayData.day}-${dayData.date}-${index}`}
              id={`day-${dayData.date}`}
              style={{
                border: dayData.date === todayDate ? "1px solid var(--primary)" : undefined,
                boxShadow: dayData.date === todayDate ? "0 0 0 1px var(--primary)" : undefined
              }}
            >
              <div className="tt-day-header">
                <div className="tt-day-badges">
                  <span className="tt-day-badge">{dayData.day}</span>
                  {dayData.date && <span className="tt-date-badge">{dayData.date}</span>}
                  {dayData.date === todayDate && (
                    <span className="badge" style={{ background: "var(--primary)", color: "white", marginLeft: 8 }}>
                      TODAY
                    </span>
                  )}
                </div>
                <span className="subtle" style={{ fontSize: "0.82rem" }}>
                  {dayData.classes.length} class{dayData.classes.length !== 1 ? "es" : ""}
                </span>
              </div>

              {/* Desktop table */}
              <div className="tt-desktop-only">
                <table className="tt-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Course</th>
                      <th>Faculty</th>
                      <th>Room</th>
                      <th>Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayData.classes.map((cls, idx) => {
                      const { code, name } = parseCourse(cls.course);
                      return (
                        <tr key={idx}>
                          <td className="tt-cell-time">{cls.time}</td>
                          <td>
                            <strong className="tt-code">{code}</strong>
                            {name && <span className="tt-cname">{name}</span>}
                          </td>
                          <td className="tt-cell-faculty">{cls.faculty || "—"}</td>
                          <td>{cls.room || "—"}</td>
                          <td>
                            {cls.batch ? (
                              <span className="badge" style={{ background: "var(--warning-soft)", color: "var(--warning)", fontSize: "0.72rem" }}>
                                {cls.batch}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="tt-mobile-only">
                {dayData.classes.map((cls, idx) => {
                  const { code, name } = parseCourse(cls.course);
                  return (
                    <div className="tt-card" key={idx}>
                      <div className="tt-card-top">
                        <span className="tt-card-time">{cls.time}</span>
                        <div className="tt-card-badges">
                          {cls.room && <span className="tt-card-room">{cls.room}</span>}
                          {cls.batch && <span className="tt-card-batch">{cls.batch}</span>}
                        </div>
                      </div>
                      <div className="tt-card-course">
                        <strong>{code}</strong>
                        {name && <span>{name}</span>}
                      </div>
                      {cls.faculty && <div className="tt-card-faculty">{cls.faculty}</div>}
                    </div>
                  );
                })}
              </div>
            </article>
          ))
        ) : (
          <div className="panel span-12">
            <p className="subtle">No timetable data available for this week.</p>
          </div>
        )}
      </section>

      <div className="notice" style={{ marginTop: 18, background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid rgba(167,105,19,0.18)", fontSize: "0.82rem", lineHeight: 1.55 }}>
        <strong>⚠ Heads up:</strong> The official SVIT ERP portal does not include selective / elective subjects in the timetable data. Because of this, our system may not be able to fetch or display them either. Sorry for the inconvenience — we can only show what the ERP gives us!
      </div>
    </main>
  );
}
