"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  CalendarDays,
  Clock,
  FileText,
  FileCheck,
  Home,
  IdCard,
  RefreshCw,
  Settings,
  Star,
  UserRound,
  Menu,
  X,
  Calculator,
  UserCircle,
  MessageSquare,
  ShoppingBag,
  Compass,
  MessageCircle,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { apiFetch, clearClientSession } from "@/lib/clientApi";

// Primary Bottom Navigation Bar (Letters removed as requested, now in features menu)
const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/timetable", label: "Timetable", icon: Clock },
  { href: "/dashboard/attendance", label: "Attendance", icon: UserRound },
  { href: "/dashboard/events", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/results", label: "Results", icon: Star },
  { href: "/dashboard/idcard", label: "ID Card", icon: IdCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

// Complete System Directory for the Topbar 3-Bar Menu
const FEATURE_GROUPS = [
  {
    title: "Core Academics",
    items: [
      { href: "/dashboard", label: "Command Center", sub: "Daily schedule & live stats", icon: Home },
      { href: "/dashboard/attendance", label: "Attendance Tracker", sub: "Subject-wise % & shortages", icon: UserRound },
      { href: "/dashboard/timetable", label: "Weekly Timetable", sub: "Lecture & laboratory schedules", icon: Clock },
      { href: "/dashboard/results", label: "Exam Results", sub: "Provisional marks & SGPA", icon: Star },
      { href: "/dashboard/events", label: "Academic Calendar", sub: "Institutional events & holidays", icon: CalendarDays },
      { href: "/dashboard/bunk", label: "Attendance Planner", sub: "Bunk & margin safety calculator", icon: Calculator },
    ],
  },
  {
    title: "Letters & Student Services",
    items: [
      { href: "/letters", label: "Common Application Form Online", sub: "Apply & track institutional letters", icon: FileText, highlight: true },
      { href: "/dashboard/letters", label: "Letter Approval Portal", sub: "Status dashboard & verified PDF", icon: FileCheck },
      { href: "/dashboard/idcard", label: "Digital Smart ID Card", sub: "Student barcode & profile card", icon: IdCard },
      { href: "/dashboard/info", label: "Student Profile", sub: "Department roster & verified info", icon: UserCircle },
    ],
  },
  {
    title: "Campus Tools & Connect",
    items: [
      { href: "/dashboard/connect", label: "Campus Connect", sub: "Peer chat & student discussions", icon: MessageSquare },
      { href: "/dashboard/marketplace", label: "Task Marketplace", sub: "Campus gigs & peer bounties", icon: ShoppingBag },
      { href: "/navigation", label: "Campus 3D Map", sub: "Indoor & outdoor GPS navigation", icon: Compass },
      { href: "/dashboard/feedback", label: "Faculty Feedback", sub: "Academic surveys & submissions", icon: MessageCircle },
      { href: "/dashboard/expenses", label: "Expense Tracker", sub: "Student budget & daily allowance", icon: Wallet },
      { href: "/dashboard/settings", label: "Settings & Theme", sub: "Account, caching & preferences", icon: Settings },
    ],
  },
];

const PAGE_META = [
  { match: "/dashboard/timetable", title: "Weekly Timetable", eyebrow: "Class schedule" },
  { match: "/dashboard/events", title: "Semester Calendar", eyebrow: "Academic events" },
  { match: "/dashboard/attendance", title: "Attendance", eyebrow: "Overall status" },
  { match: "/dashboard/results", title: "Results", eyebrow: "Provisional" },
  { match: "/dashboard/idcard", title: "Student ID Card", eyebrow: "Digital identity" },
  { match: "/dashboard/exams", title: "Semester End Exams", eyebrow: "VTU Timetable" },
  { match: "/dashboard/info", title: "Student Info", eyebrow: "Verified profile" },
  { match: "/dashboard/bunk", title: "Attendance Planner", eyebrow: "Calculator" },
  { match: "/dashboard/marketplace", title: "Task Marketplace", eyebrow: "Campus work" },
  { match: "/dashboard/connect", title: "Campus Connect", eyebrow: "Student chat" },
  { match: "/letters", title: "Common Application Form", eyebrow: "Sai Vidya Portal" },
  { match: "/dashboard/letters", title: "Letter Approval", eyebrow: "Sai Vidya Portal" },
  { match: "/dashboard", title: "Command Center", eyebrow: "SVIT ERP" },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarText, setAvatarText] = useState("SV");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const d = sessionStorage.getItem("dashboard_data");
      if (d) {
        const parsed = JSON.parse(d);
        if (parsed?.profileName) {
          const initials = parsed.profileName
            .split(" ")
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("");
          if (initials) setAvatarText(initials.toUpperCase());
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    // 1. Detect Android WebView (APK wrapper) to apply minor zoom out scaling
    const ua = navigator.userAgent || "";
    const isWebView = /wv|Android.*Version\/[0-9.]+/i.test(ua);
    if (isWebView) {
      document.documentElement.classList.add("is-apk");
    }

    return undefined;
  }, []);

  // Close drawer automatically on route navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const meta = useMemo(() => {
    return PAGE_META.find((item) => pathname === item.match || pathname.startsWith(`${item.match}/`)) || PAGE_META[PAGE_META.length - 1];
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST", retries: 0, redirectOnUnauthorized: false });
    } catch { }
    clearClientSession();
    router.replace("/");
  };

  const activeItemRef = useRef(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [pathname]);

  return (
    <div className="mobile-app-shell">
      <header className="mobile-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          {/* Three Bar Hamburger Menu Button */}
          <button
            type="button"
            className="mobile-icon-btn mobile-menu-btn"
            aria-label="Open all ERP features"
            onClick={() => setDrawerOpen(true)}
            style={{
              width: "38px",
              height: "38px",
              display: "grid",
              placeItems: "center",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f1f5f9",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Menu size={20} strokeWidth={2.2} />
          </button>

          <div className="mobile-title-block" style={{ minWidth: 0 }}>
            <span>{meta.eyebrow}</span>
            <h1 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.title}</h1>
          </div>
        </div>

        <div className="mobile-topbar-actions">
          <button type="button" className="mobile-icon-btn" aria-label="Refresh page" onClick={() => router.refresh()}>
            <RefreshCw size={18} />
          </button>
          <Link
            href="/dashboard/info"
            className="mobile-profile-chip"
            title="Click to view student profile"
            aria-label="View Student Profile"
          >
            <span className="mobile-avatar-circle">{avatarText || "SV"}</span>
            <span className="mobile-profile-cue">Profile</span>
          </Link>
          <button type="button" className="mobile-logout" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "..." : "Logout"}
          </button>
        </div>
      </header>

      <div className="mobile-app-content">
        {children}
      </div>

      {/* Floating Concentric Glass Bottom Navigation (Letters moved to 3-bar menu) */}
      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              ref={active ? activeItemRef : null}
              href={item.href}
              className={`mobile-nav-item${active ? " active" : ""}`}
            >
              <span className="mobile-nav-icon" aria-hidden="true"><item.icon size={19} strokeWidth={2} /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* All-Features Slide-out Drawer */}
      {drawerOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 150,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <aside
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(340px, 86vw)",
              height: "100%",
              background: "#0c111c",
              borderRight: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "16px 0 40px rgba(0, 0, 0, 0.8)",
              display: "flex",
              flexDirection: "column",
              animation: "drawerSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.2px" }}>
                  SVIT ERP Features
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.45)", marginTop: "2px" }}>
                  All Student Tools & Services
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                style={{
                  width: "32px",
                  height: "32px",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Features Directory */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                scrollbarWidth: "none",
              }}
            >
              {FEATURE_GROUPS.map((group) => (
                <div key={group.title}>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "rgba(255, 255, 255, 0.4)",
                      marginBottom: "8px",
                      paddingLeft: "6px",
                    }}
                  >
                    {group.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {group.items.map((feat) => {
                      const isActive = pathname === feat.href || (feat.href !== "/dashboard" && pathname.startsWith(feat.href));
                      const Icon = feat.icon;
                      return (
                        <Link
                          key={feat.href}
                          href={feat.href}
                          onClick={() => setDrawerOpen(false)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            textDecoration: "none",
                            background: isActive
                              ? "linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(37, 99, 235, 0.2) 100%)"
                              : feat.highlight
                              ? "rgba(56, 189, 248, 0.06)"
                              : "rgba(255, 255, 255, 0.02)",
                            border: isActive
                              ? "1px solid rgba(56, 189, 248, 0.35)"
                              : feat.highlight
                              ? "1px solid rgba(56, 189, 248, 0.2)"
                              : "1px solid transparent",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              display: "grid",
                              placeItems: "center",
                              background: isActive
                                ? "rgba(56, 189, 248, 0.2)"
                                : feat.highlight
                                ? "rgba(56, 189, 248, 0.12)"
                                : "rgba(255, 255, 255, 0.04)",
                              color: isActive || feat.highlight ? "#38bdf8" : "rgba(255, 255, 255, 0.7)",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={18} strokeWidth={2} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                color: isActive ? "#38bdf8" : "#ffffff",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {feat.label}
                            </div>
                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: "rgba(255, 255, 255, 0.45)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {feat.sub}
                            </div>
                          </div>
                          <ChevronRight size={14} style={{ color: "rgba(255, 255, 255, 0.3)", flexShrink: 0 }} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: "14px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "0.76rem", color: "rgba(255, 255, 255, 0.5)" }}>
                SVIT ERP · 2026-27
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#f87171",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
