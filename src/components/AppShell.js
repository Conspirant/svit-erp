"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, Home, IdCard, Info, RefreshCw, Settings, Star, UserRound } from "lucide-react";
import { apiFetch, clearClientSession } from "@/lib/clientApi";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/events", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/attendance", label: "Attendance", icon: UserRound },
  { href: "/dashboard/results", label: "Results", icon: Star },
  { href: "/dashboard/idcard", label: "ID Card", icon: IdCard },
  { href: "/dashboard/info", label: "Info", icon: Info },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
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
  { match: "/dashboard", title: "Command Center", eyebrow: "SVIT ERP" },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <div className="mobile-app-shell">
      <header className="mobile-topbar">
        <div className="mobile-title-block">
          <span>{meta.eyebrow}</span>
          <h1>{meta.title}</h1>
        </div>
        <div className="mobile-topbar-actions">
          <button type="button" className="mobile-icon-btn" aria-label="Refresh page" onClick={() => router.refresh()}>
            <RefreshCw size={20} />
          </button>
          <Link href="/dashboard/info" className="mobile-avatar" aria-label="Open profile">SV</Link>
          <button type="button" className="mobile-logout" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "..." : "Logout"}
          </button>
        </div>
      </header>

      <div className="mobile-app-content">
        {children}
      </div>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`mobile-nav-item${active ? " active" : ""}`}>
              <span className="mobile-nav-icon" aria-hidden="true"><item.icon size={22} strokeWidth={2.4} /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
