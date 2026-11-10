/**
 * Comprehensive Pre-filled Letter Templates Library
 * Covers all realistic student scenarios across Academic, Administrative, Examination,
 * Financial, Campus Facilities, and Placement categories.
 */

export const LETTER_TEMPLATES_CATALOG = [
  // ================= ACADEMIC & ATTENDANCE =================
  {
    key: "medical_leave",
    category: "Academic Affairs",
    type: "Leave of Absence Application",
    label: "🏥 Medical Leave",
    badge: "Health",
    description: "Illness, hospitalization, or viral recovery with medical certificate attachment",
    fields: {
      reason: "Unable to attend scheduled classes and laboratory sessions due to severe acute illness and medical bed rest advised by the attending physician. Medical fitness and doctor consultation certificates are attached for attendance regularization.",
      daysCount: "3",
    },
    note: "Application for medical leave condonation. Doctor consultation slip and fitness certificate attached.",
    requiresERPAttendance: false,
  },
  {
    key: "attendance_condone",
    category: "Academic Affairs",
    type: "Attendance Consideration Request",
    label: "📊 Attendance Condonation",
    badge: "Attendance",
    description: "Shortage consideration due to institutional activities, illness, or unavoidable emergencies",
    fields: {
      reason: "Requesting sympathetic attendance consideration and condonation as per university and institutional guidelines. The shortage was incurred due to documented medical reasons and representing the college in technical competitions.",
    },
    note: "Submission for semester eligibility attendance condonation.",
    requiresERPAttendance: true,
  },
  {
    key: "makeup_exam",
    category: "Academic Affairs",
    type: "Permission for Special/Makeup Exam",
    label: "📝 Makeup / Special IA",
    badge: "Exams",
    description: "Permission to appear for re-test / makeup internal assessment due to genuine absence",
    fields: {
      reason: "Could not appear for the scheduled Internal Assessment (IA) examination due to unforeseen medical emergency and hospitalization. Requesting permission to appear for the re-test / makeup assessment.",
    },
    note: "Request for makeup IA test approval with supporting medical evidence.",
    requiresERPAttendance: true,
  },
  {
    key: "onduty_event",
    category: "Academic Affairs",
    type: "Leave of Absence Application",
    label: "🏆 On-Duty (Hackathon / Sports)",
    badge: "Official",
    description: "Attendance credit (OD) for representing SVIT at external hackathons, conferences, or sports meets",
    fields: {
      reason: "Officially selected and representing Sai Vidya Institute of Technology at an inter-collegiate National Hackathon / Technical Symposium / Sports Tournament. Requesting On-Duty (OD) attendance credit for the duration of the event.",
      daysCount: "2",
    },
    note: "Official OD request. Event brochure, invitation letter, and student registration confirmation attached.",
    requiresERPAttendance: false,
  },

  // ================= CERTIFICATES & RECORDS =================
  {
    key: "bonafide_loan",
    category: "Certificates & Records",
    type: "Request for Bonafide Certificate",
    label: "🎓 Education Loan Bonafide",
    badge: "Bank",
    description: "Bonafide letter for nationalized/private bank loan processing & fee disbursement",
    fields: {
      purpose: "Required for submission to Bank (State Bank of India / Canara Bank / HDFC) for education loan application sanction, interest subsidy, and direct institutional fee disbursement for the upcoming academic year.",
    },
    note: "Needed urgently for bank educational loan file verification.",
    requiresERPAttendance: false,
  },
  {
    key: "bonafide_passport",
    category: "Certificates & Records",
    type: "Request for Bonafide Certificate",
    label: "🛂 Passport / Visa Bonafide",
    badge: "Govt",
    description: "Address and student verification proof for Passport Seva Kendra & Police Verification",
    fields: {
      purpose: "Required as bonafide student status & institutional address verification proof for Passport Application (Tatkaal / Normal) at the Regional Passport Office (PSK) and subsequent police station verification.",
    },
    note: "Required for appointment at Passport Seva Kendra.",
    requiresERPAttendance: false,
  },
  {
    key: "bonafide_bus_pass",
    category: "Certificates & Records",
    type: "Request for Bonafide Certificate",
    label: "🚌 BMTC / KSRTC Bus Pass",
    badge: "Travel",
    description: "Student concession verification for Seva Sindhu / BMTC student bus pass issuance",
    fields: {
      purpose: "Required for submission to Karnataka State Road Transport Corporation (KSRTC / BMTC) via the Seva Sindhu portal for availing student concession bus travel pass.",
    },
    note: "Needed for BMTC student concession counter processing.",
    requiresERPAttendance: false,
  },
  {
    key: "noc_internship",
    category: "Certificates & Records",
    type: "No Objection Certificate",
    label: "💼 Internship NOC",
    badge: "Career",
    description: "NOC for technical industrial training, summer internships, or research assistantships",
    fields: {
      academicYear: "2024-2028",
      purpose: "Requesting No Objection Certificate (NOC) to undergo technical industrial internship training during semester vacation / non-instructional working hours as required by the VTU curriculum.",
    },
    note: "NOC requested for industrial internship training offer.",
    requiresERPAttendance: false,
  },
  {
    key: "bonafide_scholarship",
    category: "Certificates & Records",
    type: "Request for Bonafide Certificate",
    label: "🪙 SSP / NSP Scholarship",
    badge: "Finance",
    description: "State Scholarship Portal (SSP) / National Scholarship Portal (NSP) verification document",
    fields: {
      purpose: "Required for uploading to the State Scholarship Portal (SSP / NSP / e-Kalyan) for post-matric scholarship verification and tuition fee reimbursement by the Karnataka Welfare Department.",
    },
    note: "Scholarship verification document for SSP / NSP submission.",
    requiresERPAttendance: false,
  },

  // ================= FEES & FINANCIAL =================
  {
    key: "fee_extension",
    category: "Fees & Financial",
    type: "Request for Education Loan Documents",
    label: "⏳ Fee Payment Extension",
    badge: "Accounts",
    description: "Temporary extension request for tuition/college fee payment due to loan disbursement delays",
    fields: {
      purpose: "Requesting a temporary extension of 15 days for tuition fee clearance due to processing delays in educational bank loan disbursement / agricultural harvest proceeds. Undertaking to clear dues on or before the committed date.",
    },
    note: "Formal application requesting temporary fee payment grace period.",
    requiresERPAttendance: false,
  },
  {
    key: "fee_structure_letter",
    category: "Fees & Financial",
    type: "Request for Education Loan Documents",
    label: "📑 Detailed Fee Structure",
    badge: "Accounts",
    description: "Official institutional fee estimate breakdown for bank loan approval or employer allowances",
    fields: {
      purpose: "Required for submission to the bank / parents employer for availing education reimbursement and educational loan sanction, showing year-wise tuition, development, and laboratory fee breakdown.",
    },
    note: "Requesting official fee structure statement on college letterhead.",
    requiresERPAttendance: false,
  },

  // ================= CAMPUS, LIBRARY & FACILITIES =================
  {
    key: "lost_id_card",
    category: "Library",
    type: "Lost ID Card",
    label: "🪪 Duplicate ID Card",
    badge: "Security",
    description: "Application for re-issuance of lost or damaged institutional RFID smart card",
    fields: {
      reason: "My student identity and RFID library access card was unfortunately misplaced during daily commute. I have searched thoroughly without success. Requesting approval for re-issuance of duplicate ID card after paying requisite fine.",
    },
    note: "Application for re-issuing duplicate smart ID card.",
    requiresERPAttendance: false,
  },
  {
    key: "library_fine_waiver",
    category: "Library",
    type: "Custom Letter",
    label: "📚 Library Fine / Clearance",
    badge: "Library",
    description: "Request for fine concession or special book borrowing allowance for project research",
    fields: {
      title: "Request for Library Book Renewal and Fine Concession",
      description: "Unable to return borrowed reference books on due date owing to medical quarantine / university exam preparation. Requesting sympathetic waiver of late overdue fine and account reactivation.",
    },
    note: "Library clearance and book renewal request.",
    requiresERPAttendance: false,
  },

  // ================= SPECIAL APPROVALS & PRINCIPAL =================
  {
    key: "principal_representation",
    category: "Others",
    type: "Custom Letter",
    label: "⚡ Direct to Principal",
    badge: "Principal",
    description: "Direct institutional grievance, special permissions, or high-priority matters",
    fields: {
      title: "Urgent Institutional Permission & Representation",
      description: "Humbly submitting this representation directly to the Principal's Office seeking special administrative consideration and formal institutional sanction for the matter detailed in the attached brief.",
      requiresPrincipalApproval: true,
    },
    note: "High priority application directed to Principal's office.",
    requiresERPAttendance: false,
  },
];
