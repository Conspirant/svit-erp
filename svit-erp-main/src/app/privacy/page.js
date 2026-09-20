"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, FileText, CreditCard, BellOff, ChevronLeft, Building2, Calendar, Mail, AlertTriangle, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("privacy");

  // Read tab parameter from URL query string if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["privacy", "terms", "refund", "dnd"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <main className="page-shell fade-in" style={{ maxWidth: "800px", paddingBottom: "80px" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
        <button 
          onClick={handleBack}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            width: "40px", 
            height: "40px", 
            borderRadius: "50%", 
            background: "var(--surface-soft)", 
            color: "var(--ink)", 
            cursor: "pointer",
            border: "1px solid var(--line)",
            transition: "all 0.2s ease"
          }}
          className="back-btn-hover"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            <Building2 size={14} /> Sai Vidya Institute of Technology
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--ink)", marginTop: "4px", lineHeight: 1.2 }}>Institutional Policies</h1>
        </div>
      </header>

      {/* Tabs list */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
          gap: "8px", 
          marginBottom: "28px" 
        }}
      >
        <button
          onClick={() => setActiveTab("privacy")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px",
            borderRadius: "var(--radius)",
            fontSize: "0.88rem",
            fontWeight: 800,
            cursor: "pointer",
            border: "1px solid " + (activeTab === "privacy" ? "var(--primary)" : "var(--line)"),
            background: activeTab === "privacy" ? "rgba(35, 102, 84, 0.08)" : "var(--surface)",
            color: activeTab === "privacy" ? "var(--primary)" : "var(--muted)",
            transition: "all 0.2s ease"
          }}
          className="tab-button"
        >
          <Shield size={18} />
          <span>Privacy Policy</span>
        </button>

        <button
          onClick={() => setActiveTab("terms")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px",
            borderRadius: "var(--radius)",
            fontSize: "0.88rem",
            fontWeight: 800,
            cursor: "pointer",
            border: "1px solid " + (activeTab === "terms" ? "var(--primary)" : "var(--line)"),
            background: activeTab === "terms" ? "rgba(35, 102, 84, 0.08)" : "var(--surface)",
            color: activeTab === "terms" ? "var(--primary)" : "var(--muted)",
            transition: "all 0.2s ease"
          }}
          className="tab-button"
        >
          <FileText size={18} />
          <span>Terms & Conditions</span>
        </button>

        <button
          onClick={() => setActiveTab("refund")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px",
            borderRadius: "var(--radius)",
            fontSize: "0.88rem",
            fontWeight: 800,
            cursor: "pointer",
            border: "1px solid " + (activeTab === "refund" ? "var(--primary)" : "var(--line)"),
            background: activeTab === "refund" ? "rgba(35, 102, 84, 0.08)" : "var(--surface)",
            color: activeTab === "refund" ? "var(--primary)" : "var(--muted)",
            transition: "all 0.2s ease"
          }}
          className="tab-button"
        >
          <CreditCard size={18} />
          <span>Refund Policy</span>
        </button>

        <button
          onClick={() => setActiveTab("dnd")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px",
            borderRadius: "var(--radius)",
            fontSize: "0.88rem",
            fontWeight: 800,
            cursor: "pointer",
            border: "1px solid " + (activeTab === "dnd" ? "var(--primary)" : "var(--line)"),
            background: activeTab === "dnd" ? "rgba(35, 102, 84, 0.08)" : "var(--surface)",
            color: activeTab === "dnd" ? "var(--primary)" : "var(--muted)",
            transition: "all 0.2s ease"
          }}
          className="tab-button"
        >
          <BellOff size={18} />
          <span>DND Policy</span>
        </button>
      </div>

      {/* Policy Content */}
      <section className="panel" style={{ padding: "28px", lineHeight: "1.6", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
        {activeTab === "privacy" && (
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 850, color: "var(--primary)", marginBottom: "8px" }}>Student ERP Privacy Policy</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "20px" }}>
              <Calendar size={14} /> <span>Last Updated: June 4, 2026</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "var(--ink)", fontSize: "0.92rem" }}>
              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>1. Scope & Framework</strong>
                <p>
                  Sai Vidya Institute of Technology (SVIT) is committed to protecting the privacy, confidentiality, and integrity of the personal, academic, and financial data belonging to its student body. This Privacy Policy details the protocols governing the acquisition, storage, transmission, and processing of user data within the SVIT Student Enterprise Resource Planning (ERP) platform.
                </p>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>2. Typology of Data Collected</strong>
                <p style={{ marginBottom: "8px" }}>To provide seamless academic administration and payment services, the Portal processes the following categories of information:</p>
                <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li><strong>Personally Identifiable Information (PII):</strong> Full legal name, University Seat Number (USN), Date of Birth (DOB), gender, and photo identity.</li>
                  <li><strong>Contact Parameters:</strong> Registered email addresses, secondary contact numbers, and permanent/current residential addresses.</li>
                  <li><strong>Academic Records:</strong> Course registrations, daily/cumulative attendance status, Internal Assessment (CIE) and Semester End Examination (SEE) marks, and scheduling data.</li>
                  <li><strong>Financial Transaction Metadata:</strong> Online fee payment logs, transaction status, reference numbers, and billing tokens. No payment card credentials (CVV/PIN) are stored locally on our servers.</li>
                </ul>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>3. Technical Cookies & Local Storage</strong>
                <p>
                  The website utilizes technical cookies and local storage tokens (such as <code>localStorage</code> and <code>sessionStorage</code>) exclusively to authenticate user sessions, maintain security states, and save client-side UI configurations (e.g., color themes). Anonymous browsing does not capture identifying parameters. If you do not agree to the placement of these essential cookies, please terminate the use of this portal.
                </p>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>4. Data Protection & Sharing Safeguards</strong>
                <p>
                  SVIT strictly prohibits the commercial leasing, renting, selling, or distribution of student personal data to third parties for marketing purposes. Data disclosure is limited strictly to:
                </p>
                <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>Authorized payment gateway processors and banking partners to execute fee payments.</li>
                  <li>Affiliated university bodies (Visvesvaraya Technological University) and regulators for statutory compliance.</li>
                  <li>Compliance with judicial orders or legally binding warrants issued by law enforcement authorities.</li>
                </ul>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>5. Security Implementation</strong>
                <p>
                  We utilize standard industry practices, including Secure Socket Layer (SSL/TLS) encryption during transmission, to secure data entries. Students are solely responsible for safeguarding their credential combinations (USN and Date of Birth password) from unauthorized disclosures.
                </p>
              </div>

              <div style={{ padding: "16px", borderRadius: "8px", background: "var(--surface-soft)", border: "1px solid var(--line)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <AlertTriangle size={18} style={{ color: "var(--warning)", flexShrink: 0, marginTop: "2px" }} />
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  <strong>Policy Amendments:</strong> SVIT reserves the statutory right to modify, add, or prune provisions of this policy at its absolute discretion without prior individual notification. Amendments are effective immediately upon updates being posted on this route. Nothing contained in this document creates a binding contract between the institution and visiting parties.
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "terms" && (
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 850, color: "var(--primary)", marginBottom: "8px" }}>Online Payments Terms & Conditions</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "20px" }}>
              <Calendar size={14} /> <span>Effective Date: June 4, 2026</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "var(--ink)", fontSize: "0.92rem" }}>
              <p>
                Please read these terms carefully before utilizing the online payment system. Using the online payment facility on this website indicates that you accept these terms. If you do not accept these terms, do not use this facility.
              </p>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>1. Service Provision & Description</strong>
                <p>
                  The online payment system is provided by SVIT. SVIT may update these terms from time to time and any changes will be effective immediately on being set out here. Please ensure you are aware of the current terms. The country of domicile for SVIT is India.
                </p>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>2. Transaction Requirements & Security</strong>
                <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>The description of services is specific to your need when you log in with your unique credentials. Normally, payment is required in advance (i.e. before you commence your academic activity or semester term).</li>
                  <li>All fees quoted are in Indian Rupees (INR). SVIT reserves the right to modify fees at any time.</li>
                  <li>Your payment will normally reach the SVIT account to which you are making a payment within two (2) working days.</li>
                </ul>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>3. Limitation of Institutional Liability</strong>
                <p style={{ marginBottom: "8px" }}>
                  SVIT accepts no liability for payment failures arising from client-side errors, bank failures, or card decline scenarios. Specifically:
                </p>
                <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>We cannot accept liability for a payment not reaching the correct SVIT account due to you quoting an incorrect account number or incorrect personal details.</li>
                  <li>Neither can we accept liability if payment is refused or declined by the credit/debit card supplier for any reason.</li>
                  <li>If the card supplier declines payment, SVIT is under no obligation to bring this fact to your attention. You should check with your bank/credit/debit card supplier that payment has been deducted from your account.</li>
                </ul>
              </div>

              <div style={{ padding: "16px", borderRadius: "8px", background: "var(--danger-soft)", border: "1px solid rgba(183, 51, 51, 0.18)", color: "var(--danger)", fontSize: "0.84rem", fontWeight: 700 }}>
                IN NO EVENT WILL THE SVIT BE LIABLE FOR ANY DAMAGES WHATSOEVER ARISING OUT OF THE USE, INABILITY TO USE, OR THE RESULTS OF USE OF THIS SITE, ANY WEBSITES LINKED TO THIS SITE, OR THE MATERIALS OR INFORMATION CONTAINED AT ANY OR ALL SUCH SITES, WHETHER BASED ON WARRANTY, CONTRACT, TORT OR ANY OTHER LEGAL THEORY AND WHETHER OR NOT ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </div>
            </div>
          </div>
        )}

        {activeTab === "refund" && (
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 850, color: "var(--primary)", marginBottom: "8px" }}>Refund Policy</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "20px" }}>
              <Calendar size={14} /> <span>Effective Date: June 4, 2026</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "var(--ink)", fontSize: "0.92rem" }}>
              <div style={{ borderLeft: "4px solid var(--accent)", paddingLeft: "16px", margin: "8px 0" }}>
                <p style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>
                  If the Customer leaves the SVIT before they complete their service period, there shall be no entitlement to a refund of paid service fees.
                </p>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>1. Processing and Reversals</strong>
                <p>
                  Refunds, if applicable, at the discretion of the Management, will only be made to the debit/credit card used for the original transaction.
                </p>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>2. Clarity on Unpaid Fees</strong>
                <p>
                  For the avoidance of doubt, nothing in this Policy shall require the SVIT to refund the Fees (or part thereof) unless such Fees (or part thereof) have previously been paid and successfully settled in our accounts.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dnd" && (
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 850, color: "var(--primary)", marginBottom: "8px" }}>DND (Do Not Disturb) Policy</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "20px" }}>
              <Calendar size={14} /> <span>Effective Date: June 4, 2026</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "var(--ink)", fontSize: "0.92rem" }}>
              <div>
                <strong style={{ display: "block", fontSize: "1rem", fontWeight: 800, marginBottom: "6px", color: "var(--ink)" }}>1. Opt-out Instructions</strong>
                <p>
                  If you wish to stop any further SMS/email alerts/contacts from our side, you may request exclusion from our lists. To initiate this process, please send an email to the helpdesk address below, detailing the mobile numbers and email addresses you wish to exclude.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", borderRadius: "8px", background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Mail size={16} /> Helpdesk SPOC Contact:
                </span>
                <a 
                  href="mailto:contineo@saividya.ac.in" 
                  style={{ fontSize: "1rem", fontWeight: 800, color: "var(--primary)", textDecoration: "underline" }}
                >
                  contineo@saividya.ac.in
                </a>
              </div>

              <div style={{ padding: "16px", borderRadius: "8px", background: "var(--warning-soft)", border: "1px solid rgba(167, 105, 19, 0.18)", color: "var(--warning)", fontSize: "0.84rem" }}>
                <strong>Important Notice:</strong> Opting out of notifications may result in missed alerts regarding attendance drops, immediate schedule changes, and examination deadline reminders. The institution holds no liability for consequences arising from information gaps caused by DND activation.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Global CSS Styles for Hovers and Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .tab-button {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-button:hover {
          border-color: var(--primary) !important;
          background: rgba(35, 102, 84, 0.03) !important;
          color: var(--primary) !important;
        }
        .back-btn-hover:hover {
          background: var(--line) !important;
          transform: translateX(-2px);
        }
      `}} />
    </main>
  );
}
