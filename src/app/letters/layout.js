import { Suspense } from "react";

export const metadata = {
  title: "Letter Approval | Sai Vidya Institute of Technology",
  description: "Official Institutional Letter Approval Portal for Sai Vidya Institute of Technology",
};

export default function LettersLayout({ children }) {
  return (
    <div
      className="letter-portal-shell"
    >
      <Suspense fallback={<div className="letter-loading" role="status">Loading Letter Portal...</div>}>
        {children}
      </Suspense>
    </div>
  );
}

