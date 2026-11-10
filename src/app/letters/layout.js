import { Suspense } from "react";

export const metadata = {
  title: "Letter Approval | Sai Vidya Institute of Technology",
  description: "Official Institutional Letter Approval Portal for Sai Vidya Institute of Technology",
};

export default function LettersLayout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0f14",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.7)" }}>Loading Letter Portal...</div>}>
        {children}
      </Suspense>
    </div>
  );
}

