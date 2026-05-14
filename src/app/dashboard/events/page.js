"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";

const WEEKDAYS = [
  { short: "Mon", long: "Monday" },
  { short: "Tue", long: "Tuesday" },
  { short: "Wed", long: "Wednesday" },
  { short: "Thu", long: "Thursday" },
  { short: "Fri", long: "Friday" },
  { short: "Sat", long: "Saturday" },
  { short: "Sun", long: "Sunday" },
];

const TYPE_LABELS = {
  holiday: "Holiday",
  exam: "Exam",
  normal: "Class day",
  empty: "No date",
};

function normalizeWeekday(value, fallback) {
  if (!value) return fallback;

  const source = typeof value === "string" ? { short: value, long: value } : value;
  const short = source.short || source.weekday || source.label || fallback.short;
  const long = source.long || source.weekdayFull || source.full || fallback.long;
  const match = WEEKDAYS.find((day) => day.short.toLowerCase() === String(short).slice(0, 3).toLowerCase());

  return {
    short: match?.short || String(short).slice(0, 3),
    long: match?.long || long || fallback.long,
  };
}

function getWeekdays(monthData) {
  const headers = Array.isArray(monthData?.weekdays) && monthData.weekdays.length > 0 ? monthData.weekdays : WEEKDAYS;
  return WEEKDAYS.map((fallback, index) => normalizeWeekday(headers[index], fallback));
}

function getDayWeekday(day, weekdays) {
  const column = Number.isInteger(day?.column) ? day.column : 0;
  const fallback = weekdays[column] || WEEKDAYS[column] || WEEKDAYS[0];
  return normalizeWeekday({ short: day?.weekday, long: day?.weekdayFull }, fallback);
}

function getMonthChip(month) {
  return String(month || "Month").split("-")[0].slice(0, 3);
}

export default function Events() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    queueMicrotask(() => {
      if (!alive) return;
      try {
        const cached = sessionStorage.getItem("events_data");
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch { }
    });

    apiFetch("/api/student/events")
      .then((json) => {
        if (!alive) return;
        if (json.success) {
          setData(json.data);
          try { sessionStorage.setItem("events_data", JSON.stringify(json.data)); } catch { }
        } else {
          setError(json.error || "Failed to load academic calendar.");
        }
      })
      .catch((err) => alive && setError(err.message || "Could not connect to the ERP server."))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, []);

  const calendar = useMemo(() => {
    const summaries = (data || []).map((monthData, index) => {
      const days = monthData.days || [];
      const events = monthData.events || [];
      const holidays = days.filter((day) => day.type === "holiday").length;
      const exams = days.filter((day) => day.type === "exam").length;
      return { index, monthData, days, events, holidays, exams };
    });

    const totals = summaries.reduce(
      (acc, month) => ({
        months: acc.months + 1,
        holidays: acc.holidays + month.holidays,
        exams: acc.exams + month.exams,
        events: acc.events + month.events.length,
      }),
      { months: 0, holidays: 0, exams: 0, events: 0 }
    );

    const featured = summaries.find((month) => month.events.length > 0);

    return { summaries, totals, featured };
  }, [data]);

  if (loading) {
    return (
      <main className="page-shell fade-in native-screen calendar-screen">
        <section className="calendar-loading-card">
          <div className="loader" />
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <div className="center-state">
        <div className="auth-card calendar-error-card">
          <p className="eyebrow">Calendar unavailable</p>
          <h1 className="title">Could not load events</h1>
          <p className="subtle">{error}</p>
          <button onClick={() => router.push("/")} className="button">
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell fade-in native-screen calendar-screen">
      <section className="native-page-head calendar-page-head">
        <div>
          <h1>Calendar</h1>
          <p>{calendar.totals.months || 0} months - Monday to Sunday</p>
        </div>
        <div className="calendar-head-badge" aria-label="Academic calendar">
          <CalendarDays size={22} />
        </div>
      </section>

      <section className="calendar-stats" aria-label="Calendar summary">
        <article className="calendar-stat-card">
          <span>Months</span>
          <strong>{calendar.totals.months}</strong>
        </article>
        <article className="calendar-stat-card danger">
          <span>Holidays</span>
          <strong>{calendar.totals.holidays}</strong>
        </article>
        <article className="calendar-stat-card success">
          <span>Exams</span>
          <strong>{calendar.totals.exams}</strong>
        </article>
      </section>

      {calendar.featured && (
        <section className="calendar-feature-card">
          <span>{calendar.featured.monthData.month}</span>
          <strong>{calendar.featured.events[0]}</strong>
        </section>
      )}

      {calendar.summaries.length > 0 && (
        <nav className="calendar-month-rail" aria-label="Calendar months">
          {calendar.summaries.map(({ monthData, index }) => (
            <a href={`#calendar-month-${index}`} key={`${monthData.month}-chip`}>
              {getMonthChip(monthData.month)}
            </a>
          ))}
        </nav>
      )}

      <section className="calendar-month-list">
        {calendar.summaries.length > 0 ? (
          calendar.summaries.map((summary) => {
            const weekdays = getWeekdays(summary.monthData);
            return (
              <article
                className="calendar-month-card"
                id={`calendar-month-${summary.index}`}
                key={`${summary.monthData.month}-${summary.index}`}
              >
                <div className="calendar-month-head">
                  <div>
                    <span>Month {summary.index + 1}</span>
                    <h2>{summary.monthData.month}</h2>
                  </div>
                  <div className="calendar-month-counts">
                    <span className="danger">{summary.holidays} H</span>
                    <span className="success">{summary.exams} E</span>
                  </div>
                </div>

                <div className="calendar-month-body">
                  <div className="calendar-board">
                    <div className="calendar-weekdays" role="row">
                      {weekdays.map((weekday) => (
                        <span aria-label={weekday.long} key={`${summary.monthData.month}-${weekday.short}`}>
                          <span className="weekday-full">{weekday.long}</span>
                          <span className="weekday-short">{weekday.short}</span>
                        </span>
                      ))}
                    </div>

                    <div className="calendar-grid calendar-premium-grid">
                      {summary.days.map((day, dayIndex) => {
                        const weekday = getDayWeekday(day, weekdays);
                        const label = day.day
                          ? `${weekday.long}, ${day.day} ${summary.monthData.month}. ${TYPE_LABELS[day.type] || TYPE_LABELS.normal}`
                          : `Empty ${weekday.long} cell`;

                        return (
                          <div
                            className={`day calendar-day ${day.type}`}
                            key={`${day.day || "empty"}-${dayIndex}`}
                            title={label}
                            aria-label={label}
                          >
                            {day.day && (
                              <>
                                <span className="calendar-day-number">{day.day}</span>
                                <span className="calendar-day-name">{weekday.short}</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="calendar-events-panel">
                    <div className="calendar-events-head">
                      <span>Events</span>
                      <strong>{summary.events.length}</strong>
                    </div>
                    <div className="calendar-event-stack">
                      {summary.events.length > 0 ? (
                        summary.events.map((event, eventIndex) => (
                          <article className="calendar-event-card" key={`${event}-${eventIndex}`}>
                            <span aria-hidden="true" />
                            <p>{event}</p>
                          </article>
                        ))
                      ) : (
                        <p className="calendar-empty-copy">No listed events</p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <section className="calendar-empty-state">
            <p>No calendar data available for this semester.</p>
          </section>
        )}
      </section>
    </main>
  );
}
