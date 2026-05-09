"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DevNote() {
  const router = useRouter();

  return (
    <main className="page-shell fade-in">
      <header className="app-header">
        <div>
          <p className="eyebrow">Behind the scenes</p>
          <h1 className="title">Dev Note</h1>
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
        <Link className="tab" href="/dashboard/bunk">Bunk Calc</Link>
        <Link className="tab active" href="/dashboard/dev">Dev Note</Link>
      </nav>

      <section className="grid" style={{ maxWidth: 720 }}>
        <article className="panel span-12">
          <div className="panel-head">
            <div>
              <h2 className="panel-title" style={{ fontSize: "1.2rem" }}>👋 About this project</h2>
            </div>
          </div>

          <div style={{ lineHeight: 1.75, fontSize: "0.92rem", color: "var(--ink)" }}>
            <p>
              Hello y&apos;all — this ERP page was created just as a <strong>tradition thingy</strong> that
              the respective college students usually create, like a spin-off for their own college portals
              for better handy tools and stuff. So count this as one of those tries!
            </p>

            <p style={{ marginTop: 14 }}>
              Although this doesn&apos;t have that many flashy tools as of now because yk, SVIT on its own
              has certain faculty people who don&apos;t update attendance and some of the subjects in the
              ERP portal timetable aren&apos;t mentioned — even the number of events to be held.
              But I think this might be useful to someone in some way.
            </p>

            <p style={{ marginTop: 14 }}>
              If you find any bugs or API calls being crashed please do <strong>HMU</strong>.
              But why choose SVIT lol?
            </p>
          </div>
        </article>

        <article className="panel span-12">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">⚠️ Known limitations</h2>
            </div>
          </div>

          <div className="list" style={{ fontSize: "0.88rem" }}>
            <div className="soft-box">
              <strong>Timetable</strong>
              <p className="subtle" style={{ marginTop: 4, fontSize: "0.84rem" }}>
                The official ERP does not include selective / elective subjects in the timetable data.
                We can only show what the ERP gives us.
              </p>
            </div>
            <div className="soft-box">
              <strong>Attendance</strong>
              <p className="subtle" style={{ marginTop: 4, fontSize: "0.84rem" }}>
                Some faculty don&apos;t update attendance regularly on the portal, so numbers may be
                behind the actual count.
              </p>
            </div>
            <div className="soft-box">
              <strong>Events calendar</strong>
              <p className="subtle" style={{ marginTop: 4, fontSize: "0.84rem" }}>
                The ERP event data is often incomplete — not all events and dates are listed by the
                administration.
              </p>
            </div>
          </div>
        </article>

        <div className="panel span-12" style={{ textAlign: "center", padding: "28px 22px" }}>
          <p style={{ fontStyle: "italic", color: "var(--muted)", fontSize: "0.92rem" }}>
            yours truly,
          </p>
          <p style={{ fontWeight: 800, fontSize: "1.1rem", marginTop: 6 }}>
            — Oknewspaper
          </p>
        </div>
      </section>
    </main>
  );
}
