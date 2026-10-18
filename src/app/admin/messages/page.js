"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminMessagesPage() {
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("Important notice");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("svit_admin_key");
    if (saved) setKey(saved);
  }, []);

  async function load() {
    const response = await fetch("/api/announcements", { cache: "no-store" });
    const data = await response.json();
    if (data.announcement) {
      setTitle(data.announcement.title);
      setMessage(data.announcement.message);
      setActive(data.announcement.is_active);
    }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function save(event) {
    event.preventDefault();
    setStatus("Saving…");
    const response = await fetch("/api/announcements", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ title, message, is_active: active }),
    });
    const data = await response.json();
    if (!response.ok) return setStatus(data.error || "Could not save message.");
    localStorage.setItem("svit_admin_key", key);
    setStatus("Message published successfully.");
  }

  async function hide() {
    setStatus("Hiding…");
    const response = await fetch("/api/announcements", { method: "DELETE", headers: { "x-admin-key": key } });
    setStatus(response.ok ? "Message hidden from the login page." : "Could not hide message.");
    if (response.ok) setActive(false);
  }

  return <main className="admin-message-page">
    <div className="admin-message-card">
      <Link href="/admin/navigation" className="admin-message-back">← Admin tools</Link>
      <p className="admin-message-eyebrow">PORTAL COMMUNICATIONS</p>
      <h1>Login announcement</h1>
      <p className="admin-message-intro">Write the message that visitors see when they open the portal.</p>
      <form onSubmit={save}>
        <label>Admin passcode<input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Enter admin passcode" required /></label>
        <label>Announcement title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required /></label>
        <label>Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} maxLength={5000} placeholder="Type your announcement here…" required /></label>
        <label className="admin-message-check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Show this message on the login page</label>
        <div className="admin-message-actions"><button type="submit">Publish message</button><button type="button" className="admin-message-secondary" onClick={hide}>Hide current message</button></div>
      </form>
      {status && <p className="admin-message-status">{status}</p>}
    </div>
  </main>;
}
