"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentInfo() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const cached = sessionStorage.getItem('profile_data');
        if (cached) { setData(JSON.parse(cached)); setLoading(false); }
      } catch { }
    });

    const fetchInfo = async () => {
      try {
        const res = await fetch("/api/student/profile");
        if (res.status === 401) {
          router.push("/");
          return;
        }

        const json = await res.json();
        if (json.success) {
          setData(json.data);
          try { sessionStorage.setItem('profile_data', JSON.stringify(json.data)); } catch { }
        } else {
          setError(json.error || "Failed to load profile data.");
        }
      } catch (err) {
        setError("Could not connect to the ERP server.");
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [router]);

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
          <p className="eyebrow">Profile unavailable</p>
          <h1 className="title">Could not load profile</h1>
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
          <p className="eyebrow">Student details</p>
          <h1 className="title">Your Profile</h1>
          <p className="subtle" style={{ marginTop: 8 }}>
            Basic details and academic enrollment information extracted from ERP.
          </p>
        </div>
        <button onClick={() => router.push("/")} className="button secondary">
          Logout
        </button>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        <Link className="tab" href="/dashboard">Overview</Link>
        <Link className="tab" href="/dashboard/marketplace">Marketplace</Link>
        <Link className="tab" href="/dashboard/events">Calendar</Link>
        <Link className="tab" href="/dashboard/timetable">Timetable</Link>
        <Link className="tab active" href="/dashboard/info">Profile</Link>
        <Link className="tab" href="/dashboard/bunk">Bunk Calc</Link>
        <Link className="tab" href="/dashboard/connect">Connect</Link>
      </nav>

      <section className="grid" style={{ maxWidth: 800 }}>
        <article className="panel span-12">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Basic Information</h2>
              <p className="subtle">Extracted from your current ERP session</p>
            </div>
            <div className="avatar-placeholder" style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: "bold", color: "var(--subtle-color)" }}>
              {data?.name ? data.name.charAt(0).toUpperCase() : "?"}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginTop: "16px" }}>
            <div className="soft-box">
              <p className="eyebrow">Name</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.name || "Unknown"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">USN</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4, color: "var(--primary)" }}>
                {data?.usn || "Not found"}
              </strong>
            </div>

            <div className="soft-box span-12" style={{ gridColumn: "1 / -1" }}>
              <p className="eyebrow">Department</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.department || "Not specified"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Semester</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.semester ? `Semester ${data.semester}` : "Unknown"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Quota</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.quota || "-"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Category Alloted</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.categoryalloted || "-"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Category Claimed</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.categoryclaimed || "-"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Last Year Due</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4, color: data?.lastyeardue && data.lastyeardue !== '0' ? "var(--danger)" : "inherit" }}>
                {data?.lastyeardue ? `₹${data.lastyeardue}` : "-"}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
