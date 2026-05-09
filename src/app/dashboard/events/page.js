"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function Events() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const cached = sessionStorage.getItem('events_data');
        if (cached) { setData(JSON.parse(cached)); setLoading(false); }
      } catch {}
    });

    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/student/events");
        if (res.status === 401) {
          router.push("/");
          return;
        }

        const json = await res.json();
        if (json.success) {
          setData(json.data);
          try { sessionStorage.setItem('events_data', JSON.stringify(json.data)); } catch {}
        } else {
          setError(json.error || "Failed to load academic calendar.");
        }
      } catch (err) {
        setError("Could not connect to the ERP server.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  const totals = useMemo(() => {
    const months = data || [];
    return months.reduce(
      (acc, month) => {
        acc.holidays += month.days?.filter((day) => day.type === "holiday").length || 0;
        acc.exams += month.days?.filter((day) => day.type === "exam").length || 0;
        acc.events += month.events?.length || 0;
        return acc;
      },
      { holidays: 0, exams: 0, events: 0 }
    );
  }, [data]);

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
          <p className="eyebrow">Calendar unavailable</p>
          <h1 className="title">Could not load events</h1>
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
          <p className="eyebrow">Academic calendar</p>
          <h1 className="title">Semester schedule</h1>
          <p className="subtle" style={{ marginTop: 8 }}>
            Holidays, exam days, and month-wise events from the ERP calendar.
          </p>
        </div>
        <button onClick={() => router.push("/")} className="button secondary">
          Logout
        </button>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        <Link className="tab" href="/dashboard">Overview</Link>
        <Link className="tab" href="/dashboard/marketplace">Marketplace</Link>
        <Link className="tab active" href="/dashboard/events">Calendar</Link>
        <Link className="tab" href="/dashboard/timetable">Timetable</Link>
        <Link className="tab" href="/dashboard/info">Profile</Link>
        <Link className="tab" href="/dashboard/bunk">Bunk Calc</Link>
        <Link className="tab" href="/dashboard/connect">Connect</Link>
      </nav>

      <section className="grid overview-grid" style={{ marginBottom: 16 }}>
        <div className="metric-card span-4">
          <p className="eyebrow">Months loaded</p>
          <div className="metric-value">{data?.length || 0}</div>
          <p className="subtle">Calendar sections available</p>
        </div>
        <div className="metric-card span-4">
          <p className="eyebrow">Holidays</p>
          <div className="metric-value" style={{ color: "var(--danger)" }}>{totals.holidays}</div>
          <p className="subtle">Marked non-working days</p>
        </div>
        <div className="metric-card span-4">
          <p className="eyebrow">Exam markers</p>
          <div className="metric-value" style={{ color: "var(--primary)" }}>{totals.exams}</div>
          <p className="subtle">Minor exam entries</p>
        </div>
      </section>

      <section className="grid">
        {data && data.length > 0 ? (
          data.map((monthData, index) => (
            <article className="panel" key={`${monthData.month}-${index}`}>
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">{monthData.month}</h2>
                  <p className="subtle">
                    {monthData.events?.length || 0} event{monthData.events?.length === 1 ? "" : "s"} listed
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span className="badge danger">Holiday</span>
                  <span className="badge success">Exam</span>
                </div>
              </div>

              <div className="grid calendar-layout">
                <div>
                  <div className="calendar-grid">
                    {monthData.days.map((day, dayIndex) => (
                      <div className={`day ${day.type}`} key={`${day.day}-${dayIndex}`} title={day.type}>
                        {day.day}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="list">
                  {monthData.events?.length > 0 ? (
                    monthData.events.map((event, eventIndex) => (
                      <div className="event-item" key={`${event}-${eventIndex}`}>
                        {event}
                      </div>
                    ))
                  ) : (
                    <div className="soft-box">
                      <p className="subtle">No major events listed for this month.</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="panel">
            <p className="subtle">No calendar data available for this semester.</p>
          </div>
        )}
      </section>
    </main>
  );
}
