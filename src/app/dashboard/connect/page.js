"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { containsContactInfo, filterProfanity } from "@/lib/profanityFilter";

const CHANNELS = [
  { id: "general", name: "general" },
  { id: "marketplace-help", name: "marketplace-help" },
];

const PRIVATE_TASK_STATUSES = ["accepted", "submitted", "disputed"];

const DEV_MARKETPLACE_PROFILE_KEY = "marketplace_dev_profile";
const IS_DEV_MARKETPLACE = process.env.NODE_ENV !== "production";

function getDevMarketplaceProfile() {
  if (!IS_DEV_MARKETPLACE) return null;
  try { return JSON.parse(sessionStorage.getItem(DEV_MARKETPLACE_PROFILE_KEY) || "null"); } catch { return null; }
}

function getMarketplaceTaskChannel(taskId) {
  return `marketplace-task-${taskId}`;
}

function isPrivateChatTask(task) {
  return PRIVATE_TASK_STATUSES.includes(task?.status);
}

function containsPrivateContactInfo(text) {
  const contact = containsContactInfo(text);
  if (contact.found) return contact;
  if (/(^|\s)@[\w.]{3,}/i.test(text)) return { found: true, type: "social media handle" };
  if (/\b(insta|instagram|ig)\s*[:=]?\s*[\w.]{3,}/i.test(text)) return { found: true, type: "Instagram ID" };
  if (/\b(ss|screenshot|screen\s*shot|recording|screen\s*record|blackmail|leak|expose|threat|proof|evidence)\b/i.test(text)) {
    return { found: true, type: "screenshot, recording, or coercive language" };
  }
  return { found: false, type: "" };
}

function ConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskChatId = searchParams.get("taskChat");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("channels");
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeTask, setActiveTask] = useState(null);
  const [privateTasks, setPrivateTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateChatError, setPrivateChatError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let currentProfile = null;
    queueMicrotask(() => {
      try {
        const devProfile = getDevMarketplaceProfile();
        const cached = sessionStorage.getItem("profile_data");
        if (devProfile) {
          currentProfile = devProfile;
          setProfile(currentProfile);
          setLoading(false);
        } else if (cached) {
          currentProfile = JSON.parse(cached);
          setProfile(currentProfile);
          setLoading(false);
        }
      } catch { }
    });

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/student/profile");
        if (res.status === 401) {
          router.push("/");
          return;
        }
        const json = await res.json();
        if (json.success) {
          currentProfile = getDevMarketplaceProfile() || json.data;
          setProfile(currentProfile);
          try { sessionStorage.setItem("profile_data", JSON.stringify(json.data)); } catch { }
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }

      if (currentProfile?.usn) {
        const { error } = await supabase.from("users").upsert({
          usn: currentProfile.usn,
          name: currentProfile.name || "Student",
          department: currentProfile.department || "",
          semester: currentProfile.semester || "",
          last_seen: new Date().toISOString(),
        });
        if (error) console.error("Error updating user:", error);
      }
    };

    fetchProfile();
  }, [router]);

  useEffect(() => {
    if (!taskChatId || !profile?.usn) return;

    const loadPrivateTask = async () => {
      setPrivateChatError("");
      try {
        const res = await fetch(`/api/student/marketplace/${taskChatId}`, {
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setPrivateChatError(json.error || "Could not open this marketplace chat.");
          return;
        }

        const task = json.data;
        const me = profile.usn.toUpperCase();
        const poster = task.poster_usn?.toUpperCase();
        const doer = task.accepted_by_usn?.toUpperCase();
        const canOpen = isPrivateChatTask(task) && (me === poster || me === doer);

        if (!canOpen) {
          setPrivateChatError("This private chat opens only after the poster accepts a doer.");
          return;
        }

        setActiveTask(task);
        setActiveChannel(getMarketplaceTaskChannel(task.id));
        setMode("task");
      } catch {
        setPrivateChatError("Could not open this marketplace chat.");
      }
    };

    loadPrivateTask();
  }, [taskChatId, profile?.usn]);

  useEffect(() => {
    if (!profile?.usn) return;

    const loadPrivateTasks = async () => {
      try {
        const headers = { "Content-Type": "application/json" };
        const [mineRes, acceptedRes] = await Promise.all([
          fetch("/api/student/marketplace?mine=1", { credentials: "same-origin", headers }),
          fetch("/api/student/marketplace?accepted=1", { credentials: "same-origin", headers }),
        ]);
        const [mineJson, acceptedJson] = await Promise.all([mineRes.json(), acceptedRes.json()]);
        const merged = [...(mineJson.data || []), ...(acceptedJson.data || [])]
          .filter(isPrivateChatTask)
          .reduce((items, task) => {
            if (!items.some(item => item.id === task.id)) items.push(task);
            return items;
          }, [])
          .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

        setPrivateTasks(merged);

        if (!taskChatId && merged.length > 0 && !activeTask?.id) {
          setActiveTask(merged[0]);
          setActiveChannel(getMarketplaceTaskChannel(merged[0].id));
          setMode("task");
        }
      } catch {
        setPrivateTasks([]);
      }
    };

    loadPrivateTasks();
  }, [activeTask?.id, profile?.usn, taskChatId]);

  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("last_seen", { ascending: false })
        .limit(20);
      if (!error && data) setOnlineUsers(data);
    };
    loadUsers();

    const subscription = supabase
      .channel("users_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, loadUsers)
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", activeChannel)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!error && data) setMessages(data);
    };

    loadMessages();

    const subscription = supabase
      .channel(`room:${activeChannel}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `channel=eq.${activeChannel}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (mode !== "task" || !activeTask?.id) return;
    const key = `task_chat_protocol_seen_${activeTask.id}`;
    if (sessionStorage.getItem(key)) return;
    alert("Private task chat protocol: do not share phone numbers, emails, Instagram IDs, screenshots, recordings, or threats. Keep discussion limited to task scope, completion, and safe on-campus verification. Misuse can be reported through a dispute.");
    sessionStorage.setItem(key, "1");
  }, [activeTask?.id, mode]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    setSendError("");
    if (mode === "task") {
      const contactCheck = containsPrivateContactInfo(newMessage);
      if (contactCheck.found) {
        setSendError(`Please remove the ${contactCheck.type}. Private task chats must not include contact details, screenshot/recording pressure, blackmail, or threats.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("messages").insert({
        channel: activeChannel,
        user_usn: profile.usn || "Unknown",
        user_name: mode === "task" ? (profile.name || "Student") : (profile.name || "Student"),
        content: filterProfanity(newMessage.trim()),
      });
      if (!error) setNewMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!confirm("Delete this message?")) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await supabase.from("messages").delete().eq("id", msgId);
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (loading) {
    return <div className="center-state"><div className="loader" /></div>;
  }

  return (
    <main className="page-shell fade-in">
      <header className="app-header">
        <div>
          <p className="eyebrow">SVIT Connect</p>
          <h1 className="title">Campus Chat</h1>
          <p className="subtle" style={{ marginTop: 8 }}>
            Use public rooms for campus questions and private chats for accepted marketplace work.
          </p>
        </div>
        <button onClick={() => router.push("/")} className="button secondary">Logout</button>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        <Link className="tab" href="/dashboard">Overview</Link>
        <Link className="tab" href="/dashboard/marketplace">Marketplace</Link>
        <Link className="tab" href="/dashboard/events">Calendar</Link>
        <Link className="tab" href="/dashboard/timetable">Timetable</Link>
        <Link className="tab" href="/dashboard/info">Profile</Link>
        <Link className="tab" href="/dashboard/bunk">Bunk Planner</Link>
        <Link className="tab active" href="/dashboard/connect">Connect</Link>
      </nav>

      <div className="connect-layout">
        <div className="connect-mobile-nav tt-mobile-only">
          <button className="connect-mobile-menu-btn" onClick={() => setSidebarOpen(true)}>Channels</button>
          <span style={{ fontWeight: 800 }}>{mode === "task" ? "Marketplace private chat" : `#${activeChannel}`}</span>
        </div>

        <aside className={`connect-sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
          <div className="connect-sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="connect-sidebar-title">SVIT Connect</span>
            <button className="tt-mobile-only" style={{ background: "transparent", border: "none", fontSize: "1.2rem" }} onClick={() => setSidebarOpen(false)}>x</button>
          </div>

          <div className="channel-list">
            {privateTasks.length > 0 && (
              <>
                <div style={{ margin: "0 0 8px", padding: "0 12px", fontSize: "0.75rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Marketplace
                </div>
                {privateTasks.map(task => (
                  <button
                    key={task.id}
                    className={`channel-item ${mode === "task" && activeTask?.id === task.id ? "active" : ""}`}
                    onClick={() => {
                      setActiveTask(task);
                      setMode("task");
                      setActiveChannel(getMarketplaceTaskChannel(task.id));
                      setSidebarOpen(false);
                    }}
                  >
                    <span className="channel-item-hash">Rs</span>
                    {task.title || "Private task chat"}
                  </button>
                ))}
              </>
            )}

            <div style={{ margin: "16px 0 8px", padding: "0 12px", fontSize: "0.75rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Campus Channels
            </div>

            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                className={`channel-item ${mode === "channels" && activeChannel === ch.id ? "active" : ""}`}
                onClick={() => {
                  setMode("channels");
                  setActiveChannel(ch.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="channel-item-hash">#</span>
                {ch.name}
              </button>
            ))}
          </div>

          <div style={{ padding: "12px", borderTop: "1px solid var(--line)", background: "var(--surface-soft)", fontSize: "0.8rem", color: "var(--muted)" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--success)", marginRight: 6 }} />
            {onlineUsers.length} Students active recently
          </div>

          <div className="connect-user-panel" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, color: "var(--muted)", letterSpacing: "0.05em" }}>
              Your Identity
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <div className="connect-avatar">{profile?.name?.charAt(0)?.toUpperCase() || "S"}</div>
              <div className="connect-user-info">
                <span className="connect-user-name">{profile?.name || "Student"}</span>
                <span className="connect-user-status">{profile?.usn || "Signed in"}</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="connect-chat-area">
          <div className="connect-chat-header">
            <div className="connect-chat-title">
              {mode === "task" ? (
                <>
                  <span className="connect-chat-title-hash">Rs</span>
                  Private task chat
                </>
              ) : (
                <>
                  <span className="connect-chat-title-hash">#</span>
                  {activeChannel}
                </>
              )}
            </div>

            <div className="connect-mode-toggle tt-desktop-only">
              <button
                className={`connect-mode-btn ${mode === "channels" ? "active" : ""}`}
                onClick={() => {
                  setMode("channels");
                  setActiveChannel("general");
                }}
              >
                Campus
              </button>
              {privateTasks.length > 0 && (
                <button
                  className={`connect-mode-btn ${mode === "task" ? "active" : ""}`}
                  onClick={() => {
                    setMode("task");
                    const task = activeTask || privateTasks[0];
                    setActiveTask(task);
                    setActiveChannel(getMarketplaceTaskChannel(task.id));
                  }}
                >
                  Task
                </button>
              )}
            </div>
          </div>

          {privateChatError && <div className="notice error" style={{ margin: 12 }}>{privateChatError}</div>}

          <div className="chat-messages-container">
            {mode === "task" && activeTask && (
              <div className="private-chat-disclaimer">
                <strong>Marketplace private chat for {activeTask.title}</strong>
                <p>
                  This chat is visible only to the accepted task participants in the app. For safety, do not share phone numbers, email addresses, UPI IDs, links, Instagram/social handles, screenshots, recordings, or threats here. Keep the conversation professional and limited to scope, deadline, handoff, and completion. Meet in person on campus or another appropriate college setting to verify identity before exchanging payment or materials. If anyone pressures you, threatens you, or tries to misuse chat details, stop responding and raise a dispute.
                </p>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="center-state" style={{ minHeight: "auto", flex: 1, opacity: 0.5 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontWeight: 800 }}>{mode === "task" ? "Start the task conversation" : `Welcome to #${activeChannel}`}</p>
                  <p style={{ fontSize: "0.9rem" }}>{mode === "task" ? "Discuss scope, deadline, and handoff inside this private chat." : "Be the first to send a message!"}</p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const prev = messages[i - 1];
                const showHeader = i === 0 || prev?.user_usn !== msg.user_usn || new Date(msg.created_at) - new Date(prev.created_at) > 5 * 60 * 1000;
                return (
                  <div className="chat-message" key={msg.id} style={{ marginTop: showHeader ? 8 : -8 }}>
                    {showHeader ? <div className="chat-message-avatar">{msg.user_name?.charAt(0)?.toUpperCase() || "S"}</div> : <div style={{ width: 36, flexShrink: 0 }} />}
                    <div className="chat-message-content">
                      {showHeader && (
                        <div className="chat-message-header" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                          <div>
                            <span className="chat-message-author">{msg.user_name}</span>
                            <span className="chat-message-time" style={{ marginLeft: 8 }}>{formatTime(msg.created_at)}</span>
                          </div>
                          {msg.user_usn?.toLowerCase() === profile?.usn?.toLowerCase() && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              style={{ background: "transparent", border: "none", color: "var(--danger)", fontSize: "0.75rem", cursor: "pointer", opacity: 0.6 }}
                              title="Delete message"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                      <div className={`chat-message-text${mode === "task" ? " private-message-text" : ""}`}>{msg.content}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            {sendError && <div className="chat-send-error">{sendError}</div>}
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder={mode === "task" ? "Message private task chat" : `Message #${activeChannel}`}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                disabled={isSubmitting}
              />
              <button type="submit" className="chat-send-btn" disabled={!newMessage.trim() || isSubmitting}>↑</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function Connect() {
  return (
    <Suspense fallback={<div className="center-state"><div className="loader" /></div>}>
      <ConnectContent />
    </Suspense>
  );
}
