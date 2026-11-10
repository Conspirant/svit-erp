"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Download,
  ChevronRight,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Paperclip,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Send,
  X,
  ArrowLeft,
  User,
  Shield,
  Building,
  GraduationCap,
  Mail,
  IdCard,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  QrCode,
  Users,
  Search,
  Zap,
  Bookmark,
  Trash2,
  Award,
} from "lucide-react";
import { LETTER_TEMPLATES_CATALOG } from "@/lib/letterTemplates";

export default function LetterApprovalPortal() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Authentication State
  const [session, setSession] = useState({ authenticated: false, user: null });
  const [authLoading, setAuthLoading] = useState(true);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Portal Data State
  const [letters, setLetters] = useState([]);
  const [schemas, setSchemas] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending' | 'approved' | 'rejected'
  const [selectedLetterId, setSelectedLetterId] = useState(null);
  const [copiedRef, setCopiedRef] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Verification QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);

  // Authority Directory State
  const [showAuthorityModal, setShowAuthorityModal] = useState(false);
  const [authorityDept, setAuthorityDept] = useState("CSE (Data Science)");
  const [authoritiesData, setAuthoritiesData] = useState(null);
  const [loadingAuthorities, setLoadingAuthorities] = useState(false);
  const [authoritySearch, setAuthoritySearch] = useState("");

  // New Letter Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalCategory, setModalCategory] = useState("");
  const [modalType, setModalType] = useState("");
  const [modalFields, setModalFields] = useState({});
  const [modalNote, setModalNote] = useState("");
  const [modalFiles, setModalFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Dynamic Subjects state for Attendance Consideration
  const [dynamicSubjects, setDynamicSubjects] = useState([
    { subject: "", attendance: "", missed: "" },
  ]);

  // Letter Cancellation & Withdrawal State
  const [deleteTargetLetter, setDeleteTargetLetter] = useState(null);
  const [deletingLetter, setDeletingLetter] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  // One-Click "Ping Proctor" Expedited Notice State
  const [pingModalLetter, setPingModalLetter] = useState(null);
  const [pingToEmail, setPingToEmail] = useState("");
  const [pingSubject, setPingSubject] = useState("");
  const [pingBody, setPingBody] = useState("");
  const [copiedPingText, setCopiedPingText] = useState(false);
  const [copiedPingEmail, setCopiedPingEmail] = useState(false);

  // Derive faculty email from name and department
  const deriveFacultyEmail = useCallback((name, dept) => {
    if (!name) return "proctor@saividya.ac.in";
    const clean = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, "").trim();
    const parts = clean.toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return `${parts[0]}@saividya.ac.in`;
    }
    const firstName = parts[0];
    const initials = parts.slice(1).join("");
    return `${firstName}.${initials}@saividya.ac.in`;
  }, []);

  // Open Ping Proctor Modal and prefill draft
  const handleOpenPingModal = useCallback(
    (letter) => {
      if (!letter) return;
      const proctorName = letter.assignedProctor?.name || "Proctor";
      const proctorEmail =
        letter.assignedProctor?.email ||
        deriveFacultyEmail(proctorName, letter.assignedProctor?.department);
      const studentName = session.user?.name || letter.createdBy?.name || "Student";
      const studentUSN = session.user?.usn || letter.createdBy?.usn || "SVIT Student";
      const letterType = letter.letterType || letter.title || "Letter Application";
      const createdDate = letter.createdAt
        ? new Date(letter.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
        : "Recently";
      const purpose =
        letter.letterFields?.purpose || letter.optionalNote || "College verification";

      const subject = `[Urgent Review] Letter Approval Request - ${studentUSN} (${letterType})`;

      const body = `Respected ${proctorName},

I hope this email finds you well.

I have submitted an official letter application on the Sai Vidya Letter Portal which is currently pending your verification:

• Letter Type: ${letterType}
• Student Name: ${studentName}
• USN: ${studentUSN}
• Department: ${letter.assignedProctor?.department || session.user?.department || "CSE (Data Science)"}
• Submitted On: ${createdDate}
• Purpose / Note: ${purpose}

Kindly review and approve this request on the Accredia Portal (https://erpsaividya.in) at your earliest convenience so that it may proceed to HOD approval.

Thank you for your time and guidance.

Warm regards,
${studentName}
USN: ${studentUSN}
Sai Vidya Institute of Technology`;

      setPingModalLetter(letter);
      setPingToEmail(proctorEmail);
      setPingSubject(subject);
      setPingBody(body);
      setCopiedPingText(false);
      setCopiedPingEmail(false);
    },
    [session.user, deriveFacultyEmail]
  );
  // Preload saved email & father name from storage
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("svit_saved_letters_email");
      if (savedEmail) setLoginEmail(savedEmail);
      const savedFather = localStorage.getItem("svit_letters_father_name");
      if (savedFather) {
        setModalFields((prev) => ({ ...prev, fatherName: savedFather }));
      }
    } catch {}
  }, []);

  // Fetch Letters
  const fetchLetters = useCallback(async () => {
    setLoadingLetters(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("svit_letters_token") : null;
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/letters", { headers });
      const data = await res.json();

      if (data.success && data.data?.letters) {
        setLetters(data.data.letters);
      } else if (Array.isArray(data.letters)) {
        setLetters(data.letters);
      } else if (res.status === 401 || data.message === "Token expired.") {
        setSession({ authenticated: false, user: null });
        try {
          localStorage.removeItem("svit_letters_token");
        } catch {}
      }
    } catch (err) {
      console.error("Fetch letters error:", err);
    } finally {
      setLoadingLetters(false);
    }
  }, []);

  // Withdraw / Cancel Letter Application
  const handleCancelLetter = useCallback(
    async (letter) => {
      if (!letter?._id) return;
      setDeletingLetter(true);
      setDeleteError("");
      setDeleteSuccess("");
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("svit_letters_token") : null;
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/letters/${letter._id}`, {
          method: "DELETE",
          headers,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
          throw new Error(data.message || data.error || "Failed to withdraw letter application.");
        }
        setDeleteSuccess("Application withdrawn successfully.");
        setTimeout(() => {
          setDeleteSuccess("");
          setDeleteTargetLetter(null);
          if (selectedLetterId === letter._id) {
            setSelectedLetterId(null);
          }
          fetchLetters();
        }, 900);
      } catch (err) {
        setDeleteError(err.message || "Failed to withdraw letter application.");
      } finally {
        setDeletingLetter(false);
      }
    },
    [selectedLetterId, fetchLetters]
  );

  // Fetch Schemas for letter creation
  const fetchSchemas = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("svit_letters_token") : null;
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/letters/schemas", { headers });
      const data = await res.json();
      if (data.success && data.data?.categories) {
        setSchemas(data.data.categories);
      }
    } catch (err) {
      console.error("Fetch schemas error:", err);
    }
  }, []);

  // Fetch Departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/letters/departments");
      const data = await res.json();
      if (data.success && data.data?.departments) {
        setDepartments(data.data.departments);
      }
    } catch (err) {
      console.error("Fetch departments error:", err);
    }
  }, []);

  // Fetch Authorities for Department
  const fetchAuthorities = useCallback(async (dept) => {
    setLoadingAuthorities(true);
    try {
      const res = await fetch(`/api/letters/authorities?dept=${encodeURIComponent(dept)}`);
      const data = await res.json();
      if (data.success && data.data?.authorities) {
        setAuthoritiesData(data.data.authorities);
      }
    } catch (err) {
      console.error("Fetch authorities error:", err);
    } finally {
      setLoadingAuthorities(false);
    }
  }, []);

  // Trigger authorities fetch when department changes in modal
  useEffect(() => {
    if (showAuthorityModal && authorityDept) {
      fetchAuthorities(authorityDept);
    }
  }, [showAuthorityModal, authorityDept, fetchAuthorities]);

  // Check Authentication Status
  const checkAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("svit_letters_token") : null;
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/letters/auth", { headers });
      const data = await res.json();

      if (data.authenticated && data.user) {
        setSession({ authenticated: true, user: data.user });
        if (data.user.department) setAuthorityDept(data.user.department);
        fetchLetters();
        fetchSchemas();
        fetchDepartments();
      } else {
        const savedToken = localStorage.getItem("svit_letters_token");
        const savedUser = localStorage.getItem("svit_letters_user");
        if (savedToken && savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setSession({ authenticated: true, user: parsed });
            if (parsed.department) setAuthorityDept(parsed.department);
            fetchLetters();
            fetchSchemas();
            fetchDepartments();
          } catch {
            setSession({ authenticated: false, user: null });
          }
        } else {
          setSession({ authenticated: false, user: null });
        }
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setSession({ authenticated: false, user: null });
    } finally {
      setAuthLoading(false);
    }
  }, [fetchLetters, fetchSchemas, fetchDepartments]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Sync URL query params (?id=... or ?tab=...)
  useEffect(() => {
    const idParam = searchParams.get("id");
    const tabParam = searchParams.get("tab");
    if (idParam) {
      setSelectedLetterId(idParam);
    }
    if (tabParam && ["all", "pending", "approved", "rejected"].includes(tabParam.toLowerCase())) {
      setActiveTab(tabParam.toLowerCase());
    }
  }, [searchParams]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/letters/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const { user, token } = data.data;
        setSession({ authenticated: true, user });
        if (user.department) setAuthorityDept(user.department);

        try {
          localStorage.setItem("svit_letters_token", token);
          localStorage.setItem("svit_letters_user", JSON.stringify(user));
          if (rememberEmail) {
            localStorage.setItem("svit_saved_letters_email", loginEmail.trim());
          } else {
            localStorage.removeItem("svit_saved_letters_email");
          }
          if (user.profilePhoto) {
            localStorage.setItem("svit_idcard_photo", user.profilePhoto);
          }
        } catch {}

        fetchLetters();
        fetchSchemas();
        fetchDepartments();
      } else {
        setLoginError(data.error || "Authentication failed. Please check your credentials.");
      }
    } catch (err) {
      setLoginError("Failed to reach Sai Vidya Letter Portal. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/letters/auth", { method: "DELETE" });
      localStorage.removeItem("svit_letters_token");
      localStorage.removeItem("svit_letters_user");
    } catch {}
    setSession({ authenticated: false, user: null });
    setLetters([]);
    setSelectedLetterId(null);
    setShowProfileModal(false);
    setShowAuthorityModal(false);
  };

  // Filtered Letters
  const filteredLetters = useMemo(() => {
    if (activeTab === "all") return letters;
    if (activeTab === "pending") {
      return letters.filter(
        (l) => (l.status || "").toLowerCase() === "pending" || !(l.status || "").match(/approved|rejected/)
      );
    }
    return letters.filter((l) => (l.status || "").toLowerCase() === activeTab);
  }, [letters, activeTab]);

  // Selected Letter Detail Navigation (Matching erpsaividya.in Screenshot 2)
  const selectedLetter = useMemo(() => {
    if (!selectedLetterId) return null;
    return letters.find((l) => l._id === selectedLetterId) || null;
  }, [letters, selectedLetterId]);

  const selectedLetterIdx = useMemo(() => {
    if (!selectedLetterId) return -1;
    return filteredLetters.findIndex((l) => l._id === selectedLetterId);
  }, [filteredLetters, selectedLetterId]);

  const handlePrevLetter = () => {
    if (selectedLetterIdx > 0) {
      const prevLetter = filteredLetters[selectedLetterIdx - 1];
      setSelectedLetterId(prevLetter._id);
    }
  };

  const handleNextLetter = () => {
    if (selectedLetterIdx >= 0 && selectedLetterIdx < filteredLetters.length - 1) {
      const nextLetter = filteredLetters[selectedLetterIdx + 1];
      setSelectedLetterId(nextLetter._id);
    }
  };

  const copyRef = (refNum) => {
    if (!refNum) return;
    navigator.clipboard.writeText(refNum);
    setCopiedRef(refNum);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Stats Counters
  const stats = useMemo(() => {
    const total = letters.length;
    const approved = letters.filter((l) => (l.status || "").toLowerCase() === "approved").length;
    const pending = letters.filter(
      (l) => (l.status || "").toLowerCase() === "pending" || !(l.status || "").match(/approved|rejected/)
    ).length;
    const rejected = letters.filter((l) => (l.status || "").toLowerCase() === "rejected").length;
    return { total, approved, pending, rejected };
  }, [letters]);

  // Schemas lookup for letter creation
  const currentCategorySchema = useMemo(() => {
    if (!schemas || !modalCategory) return null;
    return schemas.find((c) => c.name === modalCategory);
  }, [schemas, modalCategory]);

  const currentTypeSchema = useMemo(() => {
    if (!currentCategorySchema || !modalType) return null;
    return currentCategorySchema.subcategories?.find((s) => s.name === modalType);
  }, [currentCategorySchema, modalType]);

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setModalCategory(cat);
    setModalType("");
    setModalFields({});
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setModalType(type);
    const initialFields = {};
    const savedFather = typeof window !== "undefined" ? localStorage.getItem("svit_letters_father_name") : "";
    if (savedFather) initialFields.fatherName = savedFather;
    setModalFields(initialFields);
  };

  const handleFieldChange = (fieldName, value) => {
    setModalFields((prev) => ({ ...prev, [fieldName]: value }));
    if (fieldName === "fatherName" && value) {
      try {
        localStorage.setItem("svit_letters_father_name", value.trim());
      } catch {}
    }
  };

  // 1-Click Template Selector
  const applyTemplate = (templateKey) => {
    const tpl = LETTER_TEMPLATES_CATALOG.find((t) => t.key === templateKey);
    if (!tpl) return;

    const savedFather = typeof window !== "undefined" ? localStorage.getItem("svit_letters_father_name") || "" : "";
    const today = new Date().toISOString().split("T")[0];

    setModalCategory(tpl.category);
    setModalType(tpl.type);

    const populatedFields = { ...tpl.fields };
    if ("fatherName" in populatedFields && !populatedFields.fatherName) {
      populatedFields.fatherName = savedFather;
    }
    if ("startDate" in populatedFields) {
      populatedFields.startDate = today;
      populatedFields.endDate = today;
    }

    setModalFields(populatedFields);
    if (tpl.note) setModalNote(tpl.note);

    if (tpl.requiresERPAttendance) {
      tryAutoPopulateERPAttendance();
    }
  };

  // Auto-populate attendance from ERP Session
  const tryAutoPopulateERPAttendance = () => {
    try {
      const cached = sessionStorage.getItem("dashboard_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        const subList = parsed.attendance || parsed.courses || [];
        const lowAttendance = subList
          .filter((s) => parseFloat(s.percentage || s.attendance || 100) < 85)
          .map((s) => ({
            subject: s.courseName || s.subjectName || s.name || "Core Subject",
            attendance: String(s.percentage || s.attendance || "72%"),
            missed: String(s.classesAbsent || s.absent || "4"),
          }));

        if (lowAttendance.length > 0) {
          setDynamicSubjects(lowAttendance);
        }
      }
    } catch {}
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("svit_letters_token") : null;
      let res;

      // Bundle dynamic subjects into letterFields if modalType is Attendance Consideration Request
      const finalFields = { ...modalFields };
      if (modalType === "Attendance Consideration Request" || modalType === "Permission for Special/Makeup Exam") {
        finalFields.subjects = dynamicSubjects;
      }

      if (modalFiles.length > 0) {
        const formData = new FormData();
        formData.append("letterCategory", modalCategory);
        formData.append("letterType", modalType);
        formData.append("letterFields", JSON.stringify(finalFields));
        formData.append("optionalNote", modalNote);
        modalFiles.forEach((f) => formData.append("attachedFiles", f));

        res = await fetch("/api/letters", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        res = await fetch("/api/letters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            letterCategory: modalCategory,
            letterType: modalType,
            letterFields: finalFields,
            optionalNote: modalNote,
          }),
        });
      }

      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setShowNewModal(false);
          setSubmitSuccess(false);
          setModalCategory("");
          setModalType("");
          setModalFields({});
          setModalNote("");
          setModalFiles([]);
          fetchLetters();
        }, 1200);
      } else {
        setSubmitError(data.error || data.message || "Failed to submit letter application.");
      }
    } catch (err) {
      setSubmitError("Failed to submit. Please check your network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter authorities by search text
  const filteredProctors = useMemo(() => {
    if (!authoritiesData?.proctors) return [];
    if (!authoritySearch.trim()) return authoritiesData.proctors;
    const q = authoritySearch.toLowerCase();
    return authoritiesData.proctors.filter((p) => p.name.toLowerCase().includes(q));
  }, [authoritiesData, authoritySearch]);

  // Loading Screen
  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          gap: "16px",
        }}
      >
        <RefreshCw size={32} className="animate-spin" style={{ color: "#3b82f6" }} />
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", fontWeight: 500 }}>
          Connecting to Sai Vidya Letter Portal...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0e14", color: "#f3f4f6" }}>
      {/* =========================================================================
          TOP INSTITUTIONAL NAVIGATION BAR
         ========================================================================= */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(13, 17, 23, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Logo & Portal Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "radial-gradient(circle, #ffffff 40%, #e2e8f0 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.15)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              <Image
                src="/svit-logo.png"
                alt="SVIT Logo"
                width={38}
                height={38}
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    letterSpacing: "-0.3px",
                    color: "#ffffff",
                  }}
                >
                  Letter Approval
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    background: "rgba(59,130,246,0.18)",
                    color: "#60a5fa",
                    border: "1px solid rgba(59,130,246,0.35)",
                    padding: "2px 7px",
                    borderRadius: "6px",
                  }}
                >
                  Official Accredia API
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.74rem", color: "rgba(255,255,255,0.45)" }}>
                Sai Vidya Institute of Technology • Digital Verification Workflow
              </p>
            </div>
          </div>

          {/* Right Header Navigation */}
          {session.authenticated && session.user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Authorities Directory Button */}
              <button
                type="button"
                onClick={() => setShowAuthorityModal(true)}
                style={{
                  background: "rgba(59, 130, 246, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  color: "#93c5fd",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
                title="Browse Proctors and HODs by department"
              >
                <Shield size={14} />
                <span>Authorities</span>
              </button>

              {/* Student Identity Chip */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "0.82rem",
                  color: "#e2e8f0",
                }}
              >
                {session.user.profilePhoto ? (
                  <img
                    src={session.user.profilePhoto}
                    alt={session.user.name}
                    style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <User size={14} style={{ color: "#60a5fa" }} />
                )}
                <span style={{ fontWeight: 600 }}>
                  {session.user.name} ({session.user.usn})
                </span>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>(Student)</span>
              </div>

              {/* Profile Button */}
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Profile
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.85)",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <ArrowLeft size={14} />
                <span>Return to Student ERP</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 18px" }}>
        {/* =========================================================================
            STATE 1: NOT AUTHENTICATED -> STANDALONE LOGIN
           ========================================================================= */}
        {!session.authenticated && (
          <div
            style={{
              maxWidth: "460px",
              margin: "30px auto",
              background: "linear-gradient(180deg, #131722, #0d1017)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "32px 28px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, #ffffff 40%, #e2e8f0 100%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid rgba(59,130,246,0.3)",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.25)",
                  marginBottom: "14px",
                }}
              >
                <Image
                  src="/svit-logo.png"
                  alt="SVIT Logo"
                  width={48}
                  height={48}
                  style={{ objectFit: "contain" }}
                  priority
                />
              </div>

              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0 0 6px 0", letterSpacing: "-0.3px" }}>
                Sign In to Letter Portal
              </h1>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
                Official institutional sign-in for Leave Applications, Bonafide Certificates & Letter Approvals.
              </p>
            </div>

            {loginError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  marginBottom: "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.8)",
                    marginBottom: "6px",
                  }}
                >
                  College Email ID
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. rishabpy.25ds@saividya.ac.in"
                  required
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "11px 14px",
                    fontSize: "0.9rem",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                    Password
                  </label>
                  <a
                    href="https://erpsaividya.in/forgot-password"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.78rem", color: "#60a5fa", textDecoration: "none" }}
                  >
                    Forgot Password?
                  </a>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your portal password"
                    required
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      borderRadius: "10px",
                      padding: "11px 40px 11px 14px",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  style={{ accentColor: "#2563eb", width: "16px", height: "16px" }}
                />
                <span>Remember email on this device</span>
              </label>

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: loginLoading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                  marginTop: "6px",
                  opacity: loginLoading ? 0.75 : 1,
                }}
              >
                {loginLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Sai Vidya Portal</span>
                    <ChevronRight size={17} />
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: "24px",
                paddingTop: "18px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
              }}
            >
              <Link
                href="/"
                style={{
                  fontSize: "0.84rem",
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ArrowLeft size={14} />
                <span>Return to Student ERP</span>
              </Link>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 2: AUTHENTICATED -> LETTER DETAIL VIEW WITH MULTI-STAGE STEPPER & QR
           ========================================================================= */}
        {session.authenticated && selectedLetter ? (
          <div className="letter-detail-view" style={{ maxWidth: "880px", margin: "0 auto" }}>
            {/* Top Control Bar: Previous, Next, Index Counter, Back to Dashboard */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "10px 14px",
                borderRadius: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handlePrevLetter}
                  disabled={selectedLetterIdx <= 0}
                  style={{
                    background: selectedLetterIdx > 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
                    color: selectedLetterIdx > 0 ? "#ffffff" : "rgba(255,255,255,0.25)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: selectedLetterIdx > 0 ? "pointer" : "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextLetter}
                  disabled={selectedLetterIdx >= filteredLetters.length - 1}
                  style={{
                    background:
                      selectedLetterIdx < filteredLetters.length - 1
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(255,255,255,0.02)",
                    color:
                      selectedLetterIdx < filteredLetters.length - 1 ? "#ffffff" : "rgba(255,255,255,0.25)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: selectedLetterIdx < filteredLetters.length - 1 ? "pointer" : "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>

                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.55)",
                    fontWeight: 700,
                    marginLeft: "8px",
                  }}
                >
                  {selectedLetterIdx + 1} of {filteredLetters.length}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* QR Code Verification Button */}
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#93c5fd",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <QrCode size={15} />
                  <span>Verify / QR</span>
                </button>

                {/* Withdraw / Cancel Button for Pending Letters */}
                {selectedLetter.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTargetLetter(selectedLetter);
                      setDeleteError("");
                      setDeleteSuccess("");
                    }}
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#f87171",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    title="Withdraw this pending letter application"
                  >
                    <Trash2 size={15} />
                    <span>Withdraw</span>
                  </button>
                )}

                {/* One-Click Ping Proctor Button */}
                {selectedLetter.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleOpenPingModal(selectedLetter)}
                    style={{
                      background: "rgba(59, 130, 246, 0.12)",
                      border: "1px solid rgba(59, 130, 246, 0.35)",
                      color: "#93c5fd",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    title="Generate an official expedited review email to your proctor"
                  >
                    <Mail size={15} />
                    <span>Ping Proctor</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedLetterId(null)}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 10px rgba(37,99,235,0.3)",
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>Back to Dashboard</span>
                </button>
              </div>
            </div>

            {/* Letter Title & Header Status Badges */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span
                  style={{
                    background:
                      selectedLetter.status === "approved"
                        ? "rgba(16, 185, 129, 0.18)"
                        : selectedLetter.status === "rejected"
                        ? "rgba(239, 68, 68, 0.18)"
                        : "rgba(245, 158, 11, 0.18)",
                    color:
                      selectedLetter.status === "approved"
                        ? "#34d399"
                        : selectedLetter.status === "rejected"
                        ? "#f87171"
                        : "#fbbf24",
                    border: `1px solid ${
                      selectedLetter.status === "approved"
                        ? "rgba(16, 185, 129, 0.4)"
                        : selectedLetter.status === "rejected"
                        ? "rgba(239, 68, 68, 0.4)"
                        : "rgba(245, 158, 11, 0.4)"
                    }`,
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {selectedLetter.status || "PENDING"} {selectedLetterIdx + 1} of {filteredLetters.length}
                </span>

                {/* Reference Number Pill */}
                {selectedLetter.referenceNumber && (
                  <span
                    onClick={() => copyRef(selectedLetter.referenceNumber)}
                    style={{
                      fontSize: "0.8rem",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.85)",
                    }}
                    title="Click to copy Reference Number"
                  >
                    <code>{selectedLetter.referenceNumber}</code>
                    {copiedRef === selectedLetter.referenceNumber ? (
                      <Check size={12} color="#10b981" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </span>
                )}

                {/* Verified Download Count Pill */}
                {selectedLetter.generatedPDF?.downloadCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.76rem",
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.25)",
                      color: "#93c5fd",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    Downloaded {selectedLetter.generatedPDF.downloadCount}×
                  </span>
                )}

                {/* Download PDF Button */}
                {selectedLetter.status === "approved" && (
                  <a
                    href={`/api/letters/${selectedLetter._id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "6px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                      marginLeft: "auto",
                    }}
                  >
                    <Download size={14} />
                    <span>Download Verified PDF</span>
                  </a>
                )}
              </div>

              <h1
                style={{
                  fontSize: "1.9rem",
                  fontWeight: 800,
                  margin: "8px 0 0 0",
                  letterSpacing: "-0.5px",
                  color: "#ffffff",
                }}
              >
                {selectedLetter.letterType || selectedLetter.title || "Bonafide Certificate Request"}
              </h1>
            </div>

            {/* =========================================================================
                FEATURE 1: INTERACTIVE MULTI-STAGE APPROVAL PIPELINE STEPPER
               ========================================================================= */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "18px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={16} color="#60a5fa" />
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff", letterSpacing: "0.3px" }}>
                    Multi-Tier Approval Pipeline
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#93c5fd",
                    background: "rgba(59, 130, 246, 0.15)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: 600,
                  }}
                >
                  Stage: {selectedLetter.currentStage || "Completed"}
                </span>
              </div>

              {/* Stepper Track */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                }}
              >
                {/* Step 1: Submission */}
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#34d399" }}>1. Submitted</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                    {selectedLetter.createdBy?.name || "Student"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    {selectedLetter.createdAt ? new Date(selectedLetter.createdAt).toLocaleDateString("en-IN") : "Done"}
                  </div>
                </div>

                {/* Step 2: Assigned Proctor */}
                <div
                  style={{
                    background: selectedLetter.assignedProctor
                      ? "rgba(59, 130, 246, 0.08)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${
                      selectedLetter.assignedProctor ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.08)"
                    }`,
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    {selectedLetter.status === "approved" ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <Clock size={16} color="#60a5fa" />
                    )}
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#93c5fd" }}>2. Proctor</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                    {selectedLetter.assignedProctor?.name || "Department Proctor"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    {selectedLetter.assignedProctor?.department || "Academic Review"}
                  </div>
                  {selectedLetter.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleOpenPingModal(selectedLetter)}
                      style={{
                        marginTop: "8px",
                        background: "rgba(59, 130, 246, 0.18)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        color: "#93c5fd",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        width: "100%",
                        justifyContent: "center",
                      }}
                      title="Send notice to assigned proctor"
                    >
                      <Mail size={12} />
                      <span>Ping Proctor</span>
                    </button>
                  )}
                </div>

                {/* Step 3: Assigned HOD */}
                <div
                  style={{
                    background: selectedLetter.assignedHOD
                      ? "rgba(168, 85, 247, 0.08)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${
                      selectedLetter.assignedHOD ? "rgba(168, 85, 247, 0.3)" : "rgba(255, 255, 255, 0.08)"
                    }`,
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    {selectedLetter.status === "approved" ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <Clock size={16} color="#c084fc" />
                    )}
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#d8b4fe" }}>3. HOD Office</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                    {selectedLetter.assignedHOD?.name || "Head of Department"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    Department Approval
                  </div>
                </div>

                {/* Step 4: Final Sign-off / Office */}
                <div
                  style={{
                    background:
                      selectedLetter.status === "approved"
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${
                      selectedLetter.status === "approved"
                        ? "rgba(16, 185, 129, 0.4)"
                        : "rgba(255, 255, 255, 0.08)"
                    }`,
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    {selectedLetter.status === "approved" ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <Building size={16} color="rgba(255,255,255,0.4)" />
                    )}
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: selectedLetter.status === "approved" ? "#34d399" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      4. {selectedLetter.requiresPrincipalApproval ? "Principal" : "Office"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                    {selectedLetter.status === "approved" ? "Signed & Verified" : "Pending Sign-off"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    {selectedLetter.status === "approved" ? "PDF Available" : "Awaiting Final Seal"}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Letter Details */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "18px",
              }}
            >
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "rgba(255,255,255,0.9)", margin: "0 0 10px 0" }}>
                Letter Details
              </h2>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#93c5fd", fontWeight: 600 }}>
                {selectedLetter.letterCategory || "Certificates & Records"}
                <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 8px" }}>›</span>
                {selectedLetter.letterType || "Request for Bonafide Certificate"}
              </p>
            </div>

            {/* Section 2: Letter Content */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "18px",
              }}
            >
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "rgba(255,255,255,0.9)", margin: "0 0 12px 0" }}>
                Letter Content
              </h2>
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  fontSize: "0.92rem",
                  color: "rgba(255, 255, 255, 0.9)",
                  lineHeight: 1.6,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              >
                {selectedLetter.description ||
                  selectedLetter.optionalNote ||
                  `Request for bonafide certificate. Purpose: ${
                    selectedLetter.letterFields?.purpose || "Education Loan"
                  }`}
              </div>
            </div>

            {/* Section 3: Filled Details */}
            {selectedLetter.letterFields && Object.keys(selectedLetter.letterFields).length > 0 && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "18px",
                }}
              >
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "rgba(255,255,255,0.9)", margin: "0 0 14px 0" }}>
                  Filled Details
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {Object.entries(selectedLetter.letterFields).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "rgba(255, 255, 255, 0.02)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.88rem",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {key.replace(/([A-Z])/g, " $1")}:
                      </span>
                      <span style={{ fontSize: "0.92rem", color: "#ffffff", fontWeight: 700, textAlign: "right" }}>
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Approval Workflow History */}
            {selectedLetter.approvalHistory && selectedLetter.approvalHistory.length > 0 && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "18px",
                }}
              >
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "rgba(255,255,255,0.9)", margin: "0 0 14px 0" }}>
                  Approval Workflow History
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {selectedLetter.approvalHistory.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "12px 16px",
                        background: "rgba(16, 185, 129, 0.06)",
                        border: "1px solid rgba(16, 185, 129, 0.22)",
                        borderRadius: "10px",
                      }}
                    >
                      <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#ffffff" }}>
                          {item.role}: {item.approver?.name || item.role}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                          Approved on {new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                        {item.remarks && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "#93c5fd",
                              fontStyle: "italic",
                              marginTop: "4px",
                              paddingTop: "4px",
                              borderTop: "1px dashed rgba(255,255,255,0.08)",
                            }}
                          >
                            "{item.remarks}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 5: Application Management & Cancellation Info */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={17} color="#60a5fa" />
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "rgba(255,255,255,0.95)", margin: 0 }}>
                    Application Management & Audit Policy
                  </h2>
                </div>

              </div>

              {selectedLetter.status === "pending" ? (
                <div>
                  <p style={{ margin: "0 0 14px 0", fontSize: "0.86rem", color: "rgba(255,255,255,0.7)", lineHeight: "1.5" }}>
                    You can withdraw a pending application at any time, including if it was submitted by mistake. Withdrawing removes it from the review queue so you can submit a corrected application.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTargetLetter(selectedLetter);
                        setDeleteError("");
                        setDeleteSuccess("");
                      }}
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#f87171",
                        padding: "10px 18px",
                        borderRadius: "10px",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Withdraw / Cancel Application</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPingModal(selectedLetter)}
                      style={{
                        background: "rgba(59, 130, 246, 0.15)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        color: "#93c5fd",
                        padding: "10px 18px",
                        borderRadius: "10px",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      title="Send formal review notice to assigned proctor"
                    >
                      <Mail size={16} />
                      <span>Ping Proctor to Expedite</span>
                    </button>
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
                      Assigned Proctor: {selectedLetter.assignedProctor?.name || "Department Proctor"}
                    </span>
                  </div>
                </div>
              ) : selectedLetter.status === "approved" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "rgba(16, 185, 129, 0.05)",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <Lock size={20} color="#10b981" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#34d399", marginBottom: "2px" }}>
                      Institutional Record Sealed & Verified
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: "1.4" }}>
                      This letter has received official digital signatures and institutional seal (Ref:{" "}
                      {selectedLetter.referenceNumber || "Official"}). In accordance with VTU compliance and college governance standards, approved records cannot be cancelled or deleted.
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "rgba(239, 68, 68, 0.05)",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <XCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f87171", marginBottom: "2px" }}>
                      Application Rejected & Archived
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: "1.4" }}>
                      This application was rejected during the verification chain. You may submit a new revised letter addressing any remarks noted in the timeline above.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
              STATE 3: AUTHENTICATED -> LETTERS LIST & DASHBOARD VIEW
             ========================================================================= */
          session.authenticated && (
            <div>
              {/* Dashboard Action Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "24px",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>
                    Letter Approval Applications
                  </h1>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(255,255,255,0.6)" }}>
                    Apply for institutional letters, track multi-tier status, and download verified certificates.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setShowAuthorityModal(true)}
                    style={{
                      background: "rgba(59, 130, 246, 0.12)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      color: "#93c5fd",
                      padding: "9px 14px",
                      borderRadius: "10px",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Building size={15} />
                    <span>View Proctors & HOD</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchLetters}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.85)",
                      padding: "9px 14px",
                      borderRadius: "10px",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <RefreshCw size={14} className={loadingLetters ? "animate-spin" : ""} />
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowNewModal(true);
                      setSubmitError("");
                    }}
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "9px 18px",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                    }}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    <span>New Letter</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats Overview */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "14px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                    Total Applications
                  </span>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: "4px", color: "#ffffff" }}>
                    {stats.total}
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.22)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: 600 }}>Approved</span>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#10b981", marginTop: "4px" }}>
                    {stats.approved}
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.22)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: 600 }}>In Review</span>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f59e0b", marginTop: "4px" }}>
                    {stats.pending}
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.22)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "#f87171", fontWeight: 600 }}>Rejected</span>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#ef4444", marginTop: "4px" }}>
                    {stats.rejected}
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  paddingBottom: "10px",
                  marginBottom: "20px",
                  overflowX: "auto",
                }}
              >
                {[
                  { id: "all", label: `All (${stats.total})` },
                  { id: "pending", label: `In Review (${stats.pending})` },
                  { id: "approved", label: `Approved (${stats.approved})` },
                  { id: "rejected", label: `Rejected (${stats.rejected})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      background: activeTab === tab.id ? "rgba(59,130,246,0.18)" : "transparent",
                      border: activeTab === tab.id ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                      color: activeTab === tab.id ? "#93c5fd" : "rgba(255,255,255,0.6)",
                      padding: "7px 16px",
                      borderRadius: "20px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Letters List */}
              {loadingLetters ? (
                <div style={{ textAlign: "center", padding: "48px" }}>
                  <RefreshCw size={26} className="animate-spin" style={{ color: "#3b82f6", marginBottom: "8px" }} />
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.88rem" }}>Loading your applications...</p>
                </div>
              ) : filteredLetters.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "54px 20px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px dashed rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                  }}
                >
                  <FileText size={40} style={{ color: "rgba(255,255,255,0.2)", marginBottom: "12px" }} />
                  <h3 style={{ fontSize: "1.15rem", margin: "0 0 6px 0", color: "#ffffff" }}>No applications found</h3>
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    {activeTab === "all"
                      ? "You haven't submitted any letters yet. Click 'New Letter' above to submit an application."
                      : `You have no ${activeTab} applications.`}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {filteredLetters.map((letter) => {
                    const isApproved = (letter.status || "").toLowerCase() === "approved";
                    const isRejected = (letter.status || "").toLowerCase() === "rejected";

                    const statusColor = isApproved ? "#10b981" : isRejected ? "#ef4444" : "#f59e0b";
                    const statusBg = isApproved
                      ? "rgba(16,185,129,0.12)"
                      : isRejected
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(245,158,11,0.12)";
                    const statusBorder = isApproved
                      ? "rgba(16,185,129,0.3)"
                      : isRejected
                      ? "rgba(239,68,68,0.3)"
                      : "rgba(245,158,11,0.3)";

                    return (
                      <div
                        key={letter._id}
                        onClick={() => setSelectedLetterId(letter._id)}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "14px",
                          padding: "18px 20px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginBottom: "10px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                background: statusBg,
                                color: statusColor,
                                border: `1px solid ${statusBorder}`,
                                padding: "3px 10px",
                                borderRadius: "20px",
                                fontSize: "0.74rem",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                              }}
                            >
                              {letter.status || "PENDING"}
                            </span>

                            {letter.referenceNumber && (
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  color: "rgba(255,255,255,0.65)",
                                  background: "rgba(0,0,0,0.3)",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                {letter.referenceNumber}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.4)" }}>
                            {letter.createdAt ? new Date(letter.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                          <div>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 4px 0", color: "#ffffff" }}>
                              {letter.letterType || letter.title || "Institutional Letter"}
                            </h3>
                            <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
                              {letter.letterCategory}
                            </p>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {(letter.status || "").toLowerCase() === "pending" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTargetLetter(letter);
                                  setDeleteError("");
                                  setDeleteSuccess("");
                                }}
                                style={{
                                  background: "rgba(239, 68, 68, 0.1)",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  color: "#f87171",
                                  borderRadius: "6px",
                                  padding: "5px 10px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title="Withdraw pending letter"
                              >
                                <Trash2 size={13} />
                                <span>Withdraw</span>
                              </button>
                            )}

                            {(letter.status || "").toLowerCase() === "pending" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPingModal(letter);
                                }}
                                style={{
                                  background: "rgba(59, 130, 246, 0.12)",
                                  border: "1px solid rgba(59, 130, 246, 0.3)",
                                  color: "#93c5fd",
                                  borderRadius: "6px",
                                  padding: "5px 10px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title="Generate email to expedite proctor review"
                              >
                                <Mail size={13} />
                                <span>Ping Proctor</span>
                              </button>
                            )}

                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.84rem",
                                fontWeight: 600,
                                color: "#60a5fa",
                              }}
                            >
                              <span>View Details</span>
                              <ChevronRight size={16} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* =========================================================================
          FEATURE 2: OFFICIAL AUTHORITIES DIRECTORY MODAL (PROCTORS & HODS)
         ========================================================================= */}
      {showAuthorityModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 65,
            padding: "16px",
          }}
          onClick={() => setShowAuthorityModal(false)}
        >
          <div
            style={{
              background: "#121620",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Building size={20} color="#60a5fa" />
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                    Approval Authorities Directory
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                  Official Proctors and Head of Department roster for Sai Vidya Institute of Technology
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAuthorityModal(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Department Selector & Search */}
            <div
              style={{
                padding: "16px 24px",
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ display: "block", fontSize: "0.74rem", color: "rgba(255,255,255,0.5)", marginBottom: "4px", fontWeight: 600 }}>
                  Select Department
                </label>
                <select
                  value={authorityDept}
                  onChange={(e) => setAuthorityDept(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                >
                  {departments.length > 0 ? (
                    departments.map((d) => (
                      <option key={d.code} value={d.name} style={{ background: "#1a1f2c" }}>
                        {d.name} ({d.code})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="CSE (Data Science)" style={{ background: "#1a1f2c" }}>CSE (Data Science)</option>
                      <option value="Computer Science and Engineering" style={{ background: "#1a1f2c" }}>CSE</option>
                      <option value="Information Science and Engineering" style={{ background: "#1a1f2c" }}>ISE</option>
                      <option value="Electronics and Communication Engineering" style={{ background: "#1a1f2c" }}>ECE</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ display: "block", fontSize: "0.74rem", color: "rgba(255,255,255,0.5)", marginBottom: "4px", fontWeight: 600 }}>
                  Search Proctors
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={authoritySearch}
                    onChange={(e) => setAuthoritySearch(e.target.value)}
                    placeholder="Search by faculty name..."
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "8px 12px 8px 32px",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
                </div>
              </div>
            </div>

            {/* Authorities Content Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {loadingAuthorities ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ color: "#3b82f6", marginBottom: "8px" }} />
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>Loading authorities roster...</p>
                </div>
              ) : authoritiesData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {/* HOD Section */}
                  {authoritiesData.hods && authoritiesData.hods.length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#c084fc", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Award size={14} />
                        <span>Head of Department (HOD)</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {authoritiesData.hods.map((hod) => (
                          <div
                            key={hod._id}
                            style={{
                              background: "rgba(168, 85, 247, 0.08)",
                              border: "1px solid rgba(168, 85, 247, 0.25)",
                              borderRadius: "10px",
                              padding: "12px 16px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff" }}>
                                {hod.name}
                              </div>
                              <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.5)" }}>
                                {hod.department} • Final Academic Approval
                              </div>
                            </div>
                            <span style={{ fontSize: "0.72rem", background: "rgba(168, 85, 247, 0.2)", color: "#d8b4fe", padding: "2px 8px", borderRadius: "12px", fontWeight: 700 }}>
                              HOD
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Proctors Section */}
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#60a5fa", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Users size={14} />
                      <span>Designated Proctors ({filteredProctors.length})</span>
                    </div>

                    {filteredProctors.length === 0 ? (
                      <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>No proctors found matching "{authoritySearch}".</p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                        {filteredProctors.map((p) => (
                          <div
                            key={p._id}
                            style={{
                              background: "rgba(255, 255, 255, 0.03)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              borderRadius: "10px",
                              padding: "10px 14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff" }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>
                                {p.department}
                              </div>
                            </div>
                            <span style={{ fontSize: "0.7rem", background: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                              Proctor
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FEATURE 5: OFFICIAL VERIFICATION & QR CODE DIALOG
         ========================================================================= */}
      {showQrModal && selectedLetter && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
            padding: "16px",
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            style={{
              background: "#121620",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "20px",
              maxWidth: "400px",
              width: "100%",
              padding: "26px",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Shield size={18} color="#10b981" />
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff" }}>Verified Document QR</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* High-Contrast Verification QR Graphic */}
            <div
              style={{
                background: "#ffffff",
                padding: "18px",
                borderRadius: "14px",
                display: "inline-block",
                marginBottom: "16px",
                boxShadow: "0 4px 18px rgba(0,0,0,0.5)",
              }}
            >
              <svg width="180" height="180" viewBox="0 0 200 200" fill="none">
                <rect width="200" height="200" fill="white" />
                {/* QR Positioning Markers */}
                <rect x="15" y="15" width="50" height="50" rx="6" fill="#0b0e14" />
                <rect x="25" y="25" width="30" height="30" rx="3" fill="white" />
                <rect x="33" y="33" width="14" height="14" rx="2" fill="#0b0e14" />

                <rect x="135" y="15" width="50" height="50" rx="6" fill="#0b0e14" />
                <rect x="145" y="25" width="30" height="30" rx="3" fill="white" />
                <rect x="153" y="33" width="14" height="14" rx="2" fill="#0b0e14" />

                <rect x="15" y="135" width="50" height="50" rx="6" fill="#0b0e14" />
                <rect x="25" y="145" width="30" height="30" rx="3" fill="white" />
                <rect x="33" y="153" width="14" height="14" rx="2" fill="#0b0e14" />

                {/* Simulated Data Points */}
                <circle cx="85" cy="30" r="4" fill="#0b0e14" />
                <circle cx="105" cy="30" r="4" fill="#0b0e14" />
                <circle cx="95" cy="45" r="4" fill="#0b0e14" />
                <circle cx="85" cy="60" r="4" fill="#0b0e14" />
                <circle cx="115" cy="60" r="4" fill="#0b0e14" />

                <circle cx="30" cy="85" r="4" fill="#0b0e14" />
                <circle cx="45" cy="95" r="4" fill="#0b0e14" />
                <circle cx="60" cy="85" r="4" fill="#0b0e14" />
                <circle cx="60" cy="115" r="4" fill="#0b0e14" />

                <circle cx="85" cy="85" r="5" fill="#2563eb" />
                <circle cx="100" cy="100" r="6" fill="#10b981" />
                <circle cx="115" cy="85" r="5" fill="#2563eb" />
                <circle cx="85" cy="115" r="5" fill="#2563eb" />
                <circle cx="115" cy="115" r="5" fill="#2563eb" />

                <circle cx="145" cy="85" r="4" fill="#0b0e14" />
                <circle cx="160" cy="95" r="4" fill="#0b0e14" />
                <circle cx="175" cy="85" r="4" fill="#0b0e14" />
                <circle cx="145" cy="115" r="4" fill="#0b0e14" />

                <circle cx="85" cy="145" r="4" fill="#0b0e14" />
                <circle cx="105" cy="145" r="4" fill="#0b0e14" />
                <circle cx="95" cy="165" r="4" fill="#0b0e14" />
                <circle cx="115" cy="175" r="4" fill="#0b0e14" />
                <circle cx="145" cy="155" r="4" fill="#0b0e14" />
                <circle cx="165" cy="145" r="4" fill="#0b0e14" />
                <circle cx="175" cy="170" r="4" fill="#0b0e14" />
              </svg>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                {selectedLetter.referenceNumber || "SVIT/VERIFIED/2026"}
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>
                Scan to verify authenticity via the Accredia Institutional Ledger
              </p>
              <div style={{ marginTop: "12px", display: "inline-block", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "4px 12px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>
                Status: Verified Approved
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PROFILE MODAL
         ========================================================================= */}
      {showProfileModal && session.user && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: "16px",
          }}
          onClick={() => setShowProfileModal(false)}
        >
          <div
            style={{
              background: "#131722",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "18px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                Student Profile
              </h2>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              {session.user.profilePhoto ? (
                <img
                  src={session.user.profilePhoto}
                  alt={session.user.name}
                  style={{
                    width: "74px",
                    height: "74px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #3b82f6",
                    boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
                    marginBottom: "10px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "74px",
                    height: "74px",
                    borderRadius: "50%",
                    background: "#1e3a8a",
                    color: "#93c5fd",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    marginBottom: "10px",
                  }}
                >
                  {session.user.name?.slice(0, 2).toUpperCase() || "SV"}
                </div>
              )}

              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 4px 0", color: "#ffffff" }}>
                {session.user.name}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#60a5fa", fontWeight: 700 }}>
                {session.user.usn}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.86rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Department</span>
                <span style={{ fontWeight: 600, color: "#ffffff" }}>{session.user.department || "CSE"}</span>
              </div>

              {session.user.semester && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Semester</span>
                  <span style={{ fontWeight: 600, color: "#ffffff" }}>Semester {session.user.semester}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>College Email</span>
                <span style={{ fontWeight: 600, color: "#93c5fd" }}>{session.user.email}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Account Status</span>
                <span style={{ fontWeight: 700, color: "#34d399" }}>Active Student</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          NEW LETTER APPLICATION MODAL WITH 1-CLICK TEMPLATES & DYNAMIC SUBJECTS
         ========================================================================= */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: "16px",
          }}
          onClick={() => setShowNewModal(false)}
        >
          <div
            style={{
              background: "#121620",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "26px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 4px 0", color: "#ffffff" }}>
                  Submit Letter Application
                </h2>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
                  Use 1-click presets or customize your form for official college sign-off.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {submitSuccess ? (
              <div style={{ textAlign: "center", padding: "40px 10px" }}>
                <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: "14px" }} />
                <h3 style={{ fontSize: "1.25rem", margin: "0 0 6px 0", color: "#ffffff" }}>
                  Application Submitted!
                </h3>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(255,255,255,0.6)" }}>
                  Your request has entered the institutional approval pipeline.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* 1-Click Smart Templates Pill Bar */}
                <div
                  style={{
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "12px",
                    padding: "14px",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#93c5fd", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sparkles size={15} style={{ color: "#60a5fa" }} />
                      <span>Instant Issue Templates (Auto-fills entire form)</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Click any scenario</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", maxHeight: "160px", overflowY: "auto", paddingBottom: "2px" }}>
                    {LETTER_TEMPLATES_CATALOG.map((tpl) => (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => applyTemplate(tpl.key)}
                        title={tpl.description}
                        style={{
                          background: modalCategory === tpl.category && modalType === tpl.type 
                            ? "linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.5))" 
                            : "rgba(255, 255, 255, 0.06)",
                          border: modalCategory === tpl.category && modalType === tpl.type
                            ? "1px solid #3b82f6"
                            : "1px solid rgba(255, 255, 255, 0.12)",
                          color: "rgba(255,255,255,0.95)",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{tpl.label}</span>
                        <span style={{
                          fontSize: "0.65rem",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          background: "rgba(0,0,0,0.3)",
                          color: "rgba(255,255,255,0.7)"
                        }}>
                          {tpl.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {submitError && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#fca5a5",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    {submitError}
                  </div>
                )}

                {/* Category Selector */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.75)",
                      marginBottom: "6px",
                    }}
                  >
                    Letter Category *
                  </label>
                  <select
                    value={modalCategory}
                    onChange={handleCategoryChange}
                    required
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      borderRadius: "10px",
                      padding: "11px 14px",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  >
                    <option value="">Select Category...</option>
                    {schemas ? (
                      schemas.map((cat) => (
                        <option key={cat._id || cat.name} value={cat.name} style={{ background: "#1a1f2c" }}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Certificates & Records" style={{ background: "#1a1f2c" }}>Certificates & Records</option>
                        <option value="Academic Affairs" style={{ background: "#1a1f2c" }}>Academic Affairs</option>
                        <option value="Fees & Financial" style={{ background: "#1a1f2c" }}>Fees & Financial</option>
                        <option value="Library" style={{ background: "#1a1f2c" }}>Library</option>
                        <option value="Others" style={{ background: "#1a1f2c" }}>Others</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Subcategory / Type Selector */}
                {modalCategory && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.75)",
                        marginBottom: "6px",
                      }}
                    >
                      Letter Type *
                    </label>
                    <select
                      value={modalType}
                      onChange={handleTypeChange}
                      required
                      style={{
                        width: "100%",
                        background: "rgba(0,0,0,0.35)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                        borderRadius: "10px",
                        padding: "11px 14px",
                        fontSize: "0.9rem",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    >
                      <option value="">Select Letter Type...</option>
                      {currentCategorySchema?.subcategories ? (
                        currentCategorySchema.subcategories.map((sub) => (
                          <option key={sub._id || sub.name} value={sub.name} style={{ background: "#1a1f2c" }}>
                            {sub.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Request for Bonafide Certificate" style={{ background: "#1a1f2c" }}>Request for Bonafide Certificate</option>
                          <option value="Leave of Absence Application" style={{ background: "#1a1f2c" }}>Leave of Absence Application</option>
                          <option value="Attendance Consideration Request" style={{ background: "#1a1f2c" }}>Attendance Consideration Request</option>
                          <option value="Request for Education Loan Documents" style={{ background: "#1a1f2c" }}>Request for Education Loan Documents</option>
                          <option value="Custom Letter" style={{ background: "#1a1f2c" }}>Custom Letter</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* FEATURE 4: DYNAMIC SUBJECTS BUILDER FOR ATTENDANCE CONSIDERATION */}
                {(modalType === "Attendance Consideration Request" || modalType === "Permission for Special/Makeup Exam") && (
                  <div
                    style={{
                      background: "rgba(59, 130, 246, 0.05)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      borderRadius: "12px",
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#93c5fd" }}>
                        Subjects with Shortage / Absence
                      </div>
                      <button
                        type="button"
                        onClick={tryAutoPopulateERPAttendance}
                        style={{
                          background: "rgba(59, 130, 246, 0.2)",
                          border: "1px solid rgba(59, 130, 246, 0.4)",
                          color: "#93c5fd",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Zap size={12} />
                        <span>Pull from ERP Attendance</span>
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {dynamicSubjects.map((row, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="Subject Name (e.g. Operating Systems)"
                            value={row.subject}
                            onChange={(e) => {
                              const updated = [...dynamicSubjects];
                              updated[idx].subject = e.target.value;
                              setDynamicSubjects(updated);
                            }}
                            style={{
                              flex: 3,
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#fff",
                              borderRadius: "6px",
                              padding: "8px 10px",
                              fontSize: "0.82rem",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Att. % (e.g. 72%)"
                            value={row.attendance}
                            onChange={(e) => {
                              const updated = [...dynamicSubjects];
                              updated[idx].attendance = e.target.value;
                              setDynamicSubjects(updated);
                            }}
                            style={{
                              flex: 1.5,
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#fff",
                              borderRadius: "6px",
                              padding: "8px 10px",
                              fontSize: "0.82rem",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Missed hrs"
                            value={row.missed}
                            onChange={(e) => {
                              const updated = [...dynamicSubjects];
                              updated[idx].missed = e.target.value;
                              setDynamicSubjects(updated);
                            }}
                            style={{
                              flex: 1.2,
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#fff",
                              borderRadius: "6px",
                              padding: "8px 10px",
                              fontSize: "0.82rem",
                            }}
                          />
                          {dynamicSubjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setDynamicSubjects(dynamicSubjects.filter((_, i) => i !== idx));
                              }}
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setDynamicSubjects([...dynamicSubjects, { subject: "", attendance: "", missed: "" }]);
                        }}
                        style={{
                          background: "none",
                          border: "1px dashed rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.7)",
                          padding: "6px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          marginTop: "4px",
                        }}
                      >
                        + Add Another Subject
                      </button>
                    </div>
                  </div>
                )}

                {/* Dynamic Schema Fields */}
                {currentTypeSchema?.fields && currentTypeSchema.fields.length > 0 && (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#93c5fd" }}>
                      Required Form Fields
                    </div>
                    {currentTypeSchema.fields.map((field) => (
                      <div key={field.name}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.75)",
                            marginBottom: "4px",
                          }}
                        >
                          {field.label || field.name} {field.required && "*"}
                        </label>

                        {field.type === "checkbox" ? (
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={Boolean(modalFields[field.name])}
                              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                              style={{ accentColor: "#2563eb", width: "16px", height: "16px" }}
                            />
                            <span>{field.placeholder || "Enable this option"}</span>
                          </label>
                        ) : field.type === "textarea" ? (
                          <textarea
                            rows={3}
                            value={modalFields[field.name] || ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                            required={field.required}
                            style={{
                              width: "100%",
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#fff",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              fontSize: "0.88rem",
                            }}
                          />
                        ) : (
                          <input
                            type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                            value={modalFields[field.name] || ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                            required={field.required}
                            style={{
                              width: "100%",
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#fff",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              fontSize: "0.88rem",
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* FEATURE 3: PRINCIPAL APPROVAL DIRECT ROUTING TOGGLE (FOR CUSTOM LETTERS) */}
                {modalType === "Custom Letter" && (
                  <div
                    style={{
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      borderRadius: "10px",
                      padding: "12px 14px",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600, color: "#fbbf24" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(modalFields["requiresPrincipalApproval"])}
                        onChange={(e) => handleFieldChange("requiresPrincipalApproval", e.target.checked)}
                        style={{ accentColor: "#f59e0b", width: "16px", height: "16px" }}
                      />
                      <span>Direct Escalation: Route directly to Principal Dr. H S Ramesh Babu</span>
                    </label>
                    <p style={{ margin: "4px 0 0 24px", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                      Use for high-priority institutional matters, sports representation, or emergency sanction.
                    </p>
                  </div>
                )}

                {/* Optional Note */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                      marginBottom: "4px",
                    }}
                  >
                    Optional Statement / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide any additional institutional context or remarks..."
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.88rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* File Attachment */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                      marginBottom: "4px",
                    }}
                  >
                    Supporting Documents (Optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setModalFiles(Array.from(e.target.files || []))}
                    style={{
                      width: "100%",
                      fontSize: "0.82rem",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !modalCategory || !modalType}
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "13px",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: submitting || !modalCategory || !modalType ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                    marginTop: "6px",
                    opacity: submitting || !modalCategory || !modalType ? 0.6 : 1,
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          FEATURE 7: APPLICATION WITHDRAWAL / CANCELLATION CONFIRMATION MODAL
         ========================================================================= */}
      {deleteTargetLetter && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => !deletingLetter && setDeleteTargetLetter(null)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "12px",
                  padding: "10px",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 4px 0", color: "#ffffff" }}>
                  Withdraw Letter Application?
                </h2>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "rgba(255,255,255,0.6)" }}>
                  This will remove your application and any attached files from the review queue.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "18px",
              }}
            >
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
                {deleteTargetLetter.letterType || deleteTargetLetter.title || "Letter Application"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>
                {deleteTargetLetter.letterCategory} • Submitted on{" "}
                {deleteTargetLetter.createdAt
                  ? new Date(deleteTargetLetter.createdAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })
                  : "Recently"}
              </div>

              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#fbbf24",
                  background: "rgba(245, 158, 11, 0.1)",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertCircle size={14} />
                <span>This action permanently withdraws the application and removes it from the review queue.</span>
              </div>
            </div>

            {deleteError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            {deleteSuccess && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#6ee7b7",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CheckCircle2 size={16} />
                <span>{deleteSuccess}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                disabled={deletingLetter}
                onClick={() => {
                  setDeleteTargetLetter(null);
                  setDeleteError("");
                  setDeleteSuccess("");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: deletingLetter ? "not-allowed" : "pointer",
                }}
              >
                Keep Application
              </button>

              <button
                type="button"
                disabled={deletingLetter}
                onClick={() => handleCancelLetter(deleteTargetLetter)}
                style={{
                  background: "#ef4444",
                  border: "none",
                  color: "#ffffff",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: deletingLetter ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 10px rgba(239, 68, 68, 0.35)",
                }}
              >
                {deletingLetter ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Withdrawing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Yes, Withdraw Letter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FEATURE 8: ONE-CLICK "PING PROCTOR" EXPEDITED REVIEW NOTICE MODAL
         ========================================================================= */}
      {pingModalLetter && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setPingModalLetter(null)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "12px",
                    padding: "10px",
                    color: "#60a5fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mail size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 2px 0", color: "#ffffff" }}>
                    Ping Proctor — Expedited Review Notice
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>
                    Notify your assigned faculty proctor to review and approve your pending application.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPingModalLetter(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Target Proctor Card */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: 700,
                  }}
                >
                  Assigned Verification Proctor
                </div>
                <div style={{ fontSize: "1.02rem", fontWeight: 700, color: "#ffffff", marginTop: "2px" }}>
                  {pingModalLetter.assignedProctor?.name || "Department Proctor"}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#93c5fd", marginTop: "2px" }}>
                  {pingModalLetter.assignedProctor?.department || session.user?.department || "CSE (Data Science)"}
                </div>
              </div>

              <span
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                }}
              >
                Pending Review
              </span>
            </div>

            {/* Email Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              {/* To Email Field */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                    Proctor Email Address
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pingToEmail);
                      setCopiedPingEmail(true);
                      setTimeout(() => setCopiedPingEmail(false), 1500);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: copiedPingEmail ? "#34d399" : "#60a5fa",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {copiedPingEmail ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedPingEmail ? "Copied Email!" : "Copy Email"}</span>
                  </button>
                </div>
                <input
                  type="email"
                  value={pingToEmail}
                  onChange={(e) => setPingToEmail(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                  Auto-derived from official SVIT faculty directory. You can edit this if you have their alternate contact.
                </div>
              </div>

              {/* Subject */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: "6px",
                  }}
                >
                  Subject Line
                </label>
                <input
                  type="text"
                  value={pingSubject}
                  onChange={(e) => setPingSubject(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Body */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                    Message Body (Pre-filled with your USN & Letter details)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pingBody);
                      setCopiedPingText(true);
                      setTimeout(() => setCopiedPingText(false), 1500);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: copiedPingText ? "#34d399" : "#60a5fa",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {copiedPingText ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedPingText ? "Copied Message!" : "Copy Text"}</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={pingBody}
                  onChange={(e) => setPingBody(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "0.84rem",
                    lineHeight: "1.45",
                    fontFamily: "inherit",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
              {/* Copy Full Message Button */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${pingSubject}\n\n${pingBody}`);
                  setCopiedPingText(true);
                  setTimeout(() => setCopiedPingText(false), 1500);
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "9px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {copiedPingText ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copiedPingText ? "Copied to Clipboard!" : "Copy Full Notice"}</span>
              </button>

              {/* Open in Gmail Web */}
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                  pingToEmail
                )}&su=${encodeURIComponent(pingSubject)}&body=${encodeURIComponent(pingBody)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#fca5a5",
                  borderRadius: "8px",
                  padding: "9px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ExternalLink size={14} />
                <span>Open in Gmail Web</span>
              </a>

              {/* Default Mailto Link */}
              <a
                href={`mailto:${encodeURIComponent(pingToEmail)}?subject=${encodeURIComponent(
                  pingSubject
                )}&body=${encodeURIComponent(pingBody)}`}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "9px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 10px rgba(37,99,235,0.35)",
                }}
              >
                <Send size={14} />
                <span>Open in Mail App</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
