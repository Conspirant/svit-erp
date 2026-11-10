"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function DashboardLettersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/letters");
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        gap: "12px",
        color: "#fff",
      }}
    >
      <RefreshCw size={24} className="animate-spin" style={{ color: "#3b82f6" }} />
      <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>Redirecting to Letter Approval Portal...</p>
    </div>
  );
}
