/**
 * Contextual Professional Pre-fill Presets per Letter Type
 * Maps directly to the selected Letter Category & Letter Type dropdowns.
 * When a student selects ANY Category & Letter Type, these presets dynamically appear
 * right above the form fields so they can 1-click fill professional, formal justification text.
 */

export const LETTER_TYPE_PRESETS = {
  // ================= 1. ACADEMIC AFFAIRS =================
  "Leave of Absence Application": [
    {
      label: "🏥 Medical / Viral Illness",
      fields: {
        reason: "I was diagnosed with acute viral fever and severe physical exhaustion. The attending physician strictly advised complete bed rest and clinical quarantine from classes and laboratories. Medical consultation slip and fitness certificate are enclosed.",
        daysCount: "3",
      },
      note: "Formal medical leave regularization. Doctor's prescription slip and fitness certificate attached.",
    },
    {
      label: "👨‍👩‍👧 Urgent Family Emergency",
      fields: {
        reason: "I had to travel to my hometown on short notice owing to an unavoidable family medical emergency. I have taken notes from classmates to catch up on missed lecture portions.",
        daysCount: "2",
      },
      note: "Family emergency leave. Parent communication attached.",
    },
    {
      label: "🏆 Hackathon / Technical Symposium",
      fields: {
        reason: "Representing Sai Vidya Institute of Technology at an inter-collegiate National Hackathon / Technical Innovation Summit. Requesting official On-Duty (OD) sanction for missed lecture and lab sessions.",
        daysCount: "2",
      },
      note: "On-Duty (OD) attendance credit request. Event brochure and registration confirmation attached.",
    },
    {
      label: "⚽ Inter-Collegiate Sports / Cultural",
      fields: {
        reason: "Selected to represent the college sports contingent / cultural team at the university inter-collegiate tournament. Requesting approval for leave and corresponding attendance credit.",
        daysCount: "3",
      },
      note: "Sports/Cultural OD representation. Selection letter endorsed by Physical Education Director attached.",
    },
  ],

  "Attendance Consideration Request": [
    {
      label: "🩺 Post-Illness Attendance Condonation",
      fields: {
        reason: "Humbly submitting an attendance consideration appeal due to acute health complications during the semester. I have maintained consistent academic discipline and completed all assignments. Requesting sympathetic condonation as per university norms.",
      },
      note: "Semester exam eligibility condonation request with attached medical history.",
    },
    {
      label: "⚡ Institutional Representation Condonation",
      fields: {
        reason: "Attendance percentage fell marginally below threshold due to active participation in college-sanctioned hackathons, accreditation exhibits, and VTU sports tournaments. Requesting adjustment of sanctioned On-Duty hours.",
      },
      note: "Condonation appeal backed by departmental OD authorization slips.",
    },
  ],

  "Permission for Special/Makeup Exam": [
    {
      label: "📝 Hospitalization During IA",
      fields: {
        reason: "Could not appear for the scheduled Internal Assessment (IA) examination due to sudden severe illness and emergency outpatient hospitalization. Requesting formal permission to appear for the makeup assessment.",
      },
      note: "Application for makeup IA test. Emergency doctor discharge summary attached.",
    },
    {
      label: "🚆 Travel / Train Delay During Exam",
      fields: {
        reason: "Inadvertently missed the morning IA test due to unprecedented inter-city railway cancellation and transit breakdown. Requesting makeup test permission to safeguard academic internal score.",
      },
      note: "Makeup test request with train delay confirmation bulletin attached.",
    },
  ],

  // ================= 2. CERTIFICATES & RECORDS =================
  "Request for Bonafide Certificate": [
    {
      label: "🎓 Bank Education Loan",
      fields: {
        purpose: "Required for submission to the Nationalized / Commercial Bank (State Bank of India / Canara Bank / HDFC Bank) for sanction, verification, and disbursement of Student Education Loan for academic year 2026-27.",
      },
      note: "Urgent bonafide letter required for educational bank loan approval file.",
    },
    {
      label: "🛂 Passport Application / Police Verification",
      fields: {
        purpose: "Required as bonafide student status & institutional local residence verification proof for Passport Application at the Regional Passport Seva Kendra (PSK) and subsequent local police station verification.",
      },
      note: "Required for appointment at Passport Seva Kendra.",
    },
    {
      label: "🚌 BMTC / KSRTC Student Bus Pass",
      fields: {
        purpose: "Required for uploading to the Karnataka Seva Sindhu / BMTC portal for issuance of student concessional bus travel pass for daily commute between residence and SVIT campus.",
      },
      note: "For BMTC / KSRTC student concession pass counter.",
    },
    {
      label: "🪙 State / Central Scholarship (SSP/NSP)",
      fields: {
        purpose: "Required for document upload on the Karnataka State Scholarship Portal (SSP / e-Kalyan / NSP) for verification of bonafide admission status and post-matric tuition fee reimbursement.",
      },
      note: "Scholarship verification document for SSP portal upload.",
    },
    {
      label: "🌍 Visa / International Travel Proof",
      fields: {
        purpose: "Required for submission to the Embassy / Consulate General as institutional verification and 'No Objection' for student tourist/visitor visa processing during semester vacation.",
      },
      note: "Consulate visa verification request.",
    },
  ],

  "No Objection Certificate": [
    {
      label: "💼 Summer Industrial Internship",
      fields: {
        academicYear: "2024-2028",
        purpose: "Requesting No Objection Certificate (NOC) to undergo a technical industrial internship during vacation / non-instructional hours as mandated by the VTU technical curriculum. The training will not interfere with academic hours.",
      },
      note: "Internship NOC. Corporate offer letter attached.",
    },
    {
      label: "🔬 External Research / Project Work",
      fields: {
        academicYear: "2024-2028",
        purpose: "Requesting NOC to carry out specialized research and final year capstone project experimentation at an external national research laboratory / public sector undertaking.",
      },
      note: "External laboratory research collaboration NOC.",
    },
  ],

  // ================= 3. FEES & FINANCIAL =================
  "Request for Education Loan Documents": [
    {
      label: "⏳ Tuition Fee Extension Request",
      fields: {
        purpose: "Humbly requesting a temporary grace period of 15-20 days for clearance of the outstanding semester tuition fees. Educational bank loan disbursement is currently under final underwriting. I undertake to clear all dues promptly upon bank credit.",
      },
      note: "Tuition fee payment extension request with loan sanction letter attached.",
    },
    {
      label: "📑 Detailed Fee Estimate Structure",
      fields: {
        purpose: "Requesting official institutional fee estimate breakdown on college letterhead (including Tuition Fee, VTU University Fee, Development Fee, and Laboratory Fee) for submission to bank loan officers / parental employer reimbursement.",
      },
      note: "Formal fee estimate breakdown request.",
    },
  ],

  // ================= 4. INTERNSHIPS & CAREER =================
  "Internship Permission": [
    {
      label: "🏢 Full-time Semester Internship (8th Sem)",
      fields: {
        companyName: "Technology Enterprise Solutions",
        role: "Software Engineering Intern",
        stipend: "₹25,000 / month",
        purpose: "Selected through placement rounds for an 8th-semester industry internship. Requesting departmental approval and academic credit mapping as per VTU guidelines.",
      },
      note: "8th-semester industry internship formal clearance.",
    },
    {
      label: "💻 Virtual / Part-time Technical Internship",
      fields: {
        companyName: "Cloud Innovations Lab",
        role: "Cloud DevOps Trainee",
        stipend: "Unpaid / Academic Credit",
        purpose: "Requesting formal department endorsement for pursuing an off-hours virtual technical internship to acquire practical skills in cloud infrastructure.",
      },
      note: "Virtual internship endorsement request.",
    },
  ],

  // ================= 5. LIBRARY =================
  "Lost ID Card": [
    {
      label: "🪪 Lost RFID Smart ID Card",
      fields: {
        reason: "My student identification RFID smart card was misplaced during transit. Despite diligent effort, it could not be recovered. I have completed library dues clearance and request approval for issuance of a duplicate card.",
      },
      note: "Duplicate ID card application. Penalty fee payment receipt attached.",
    },
    {
      label: "⚡ Damaged / Non-Functional Chip Card",
      fields: {
        reason: "The RFID embedded chip inside my student identity card has malfunctioned and is not reading at the biometric library turnstile. Requesting replacement smart card re-issuance.",
      },
      note: "Defective RFID card replacement request.",
    },
  ],

  // ================= 6. OTHERS / PRINCIPAL =================
  "Custom Letter": [
    {
      label: "⚡ Direct Appeal to Principal",
      fields: {
        title: "Urgent Representation for Institutional Sanction",
        description: "Humbly submitting this representation directly to the Principal's Office seeking special administrative consideration and formal institutional sanction for the matter detailed in the attached brief.",
        requiresPrincipalApproval: true,
      },
      note: "High-priority direct representation to Principal.",
    },
    {
      label: "🏛️ Hostel Room Change / Special Permission",
      fields: {
        title: "Request for Hostel Room Reallocation & Quiet Study",
        description: "Requesting reallocation of hostel room due to medical health needs and requirement of a quiet study environment for competitive exam preparation.",
        requiresPrincipalApproval: false,
      },
      note: "Hostel room reallocation request.",
    },
    {
      label: "🚌 College Bus Route Modification",
      fields: {
        title: "Request for Transport Route Pickup Change",
        description: "Requesting official change of college bus pickup point due to change in family residential address. Willing to adjust transport fee difference if applicable.",
        requiresPrincipalApproval: false,
      },
      note: "Transport route adjustment request.",
    },
  ],
};
