/**
 * Comprehensive Category & Subcategory Master Map with Professional Presets
 * Ensures that EVERY category shown in the UI:
 * 1. Certificates & Records
 * 2. Academic Affairs
 * 3. Fees & Financial
 * 4. Internships & Career
 * 5. Library
 * 6. Others
 * Has all its realistic subcategories available and populated with high-grade professional templates!
 */

export const CATEGORY_SUBCATEGORIES_MAP = {
  "Academic Affairs": [
    "Leave of Absence Application",
    "Attendance Consideration Request",
    "Permission for Special/Makeup Exam",
    "Change of Elective Course",
    "Semester Break / Gap Year Request"
  ],
  "Certificates & Records": [
    "Request for Bonafide Certificate",
    "No Objection Certificate",
    "Study / Medium of Instruction Certificate",
    "Character & Conduct Certificate",
    "Transcripts / Marks Card Attestation"
  ],
  "Fees & Financial": [
    "Request for Education Loan Documents",
    "Fee Payment Extension Request",
    "Fee Concession / Scholarship Request",
    "Excess Fee Refund Application",
    "Bus / Transport Fee Receipt Request"
  ],
  "Internships & Career": [
    "Internship Permission",
    "Placement On-Duty (OD) Request",
    "Industrial Training Endorsement",
    "Recommendation Letter (LOR)",
    "External Project / Workshop Clearance"
  ],
  "Library": [
    "Lost ID Card",
    "Book Due Date Extension & Fine Waiver",
    "Book Bank Scheme Enrollment",
    "No Dues Clearance Certificate",
    "Inter-Library Borrowing Card Request"
  ],
  "Others": [
    "Custom Letter",
    "Hostel Admission & Room Change",
    "College Bus Route Modification",
    "Campus Wi-Fi / Portal Access Issue",
    "Sports & Cultural Activity Sanction"
  ]
};

export const ALL_LETTER_TYPE_PRESETS = {
  // ================= 1. ACADEMIC AFFAIRS =================
  "Leave of Absence Application": [
    {
      label: "🏥 Medical Illness",
      fields: {
        reason: "Diagnosed with acute viral illness and severe dehydration. Under doctor's clinical prescription for complete bed rest and quarantine. Enclosing medical fitness certificate and outpatient slip.",
        daysCount: "3",
      },
      note: "Formal medical leave regularization with attached prescription and fitness slip.",
    },
    {
      label: "👨‍👩‍👧 Family Emergency",
      fields: {
        reason: "Required to urgently travel to native hometown to attend to an unexpected family emergency. I have taken lecture notes from peers to make up for missed syllabus.",
        daysCount: "2",
      },
      note: "Family emergency absence request.",
    },
    {
      label: "🏆 Hackathon OD",
      fields: {
        reason: "Selected to represent Sai Vidya Institute of Technology at an external National Hackathon / Technical Symposium. Requesting formal On-Duty (OD) sanction for missed lecture and lab hours.",
        daysCount: "2",
      },
      note: "Hackathon OD representation. Event brochure and registration confirmation attached.",
    },
    {
      label: "⚽ Sports Meet OD",
      fields: {
        reason: "Participating in the University Inter-Collegiate Tournament as part of the official college sports contingent. Requesting approved leave and attendance credit.",
        daysCount: "3",
      },
      note: "Sports contingent participation endorsed by the Physical Education Department.",
    },
  ],

  "Attendance Consideration Request": [
    {
      label: "🩺 Health Condonation",
      fields: {
        reason: "Submitting a formal attendance consideration appeal due to documented health complications during instructional weeks. I have maintained consistent discipline and cleared all assignments. Requesting sympathetic condonation.",
      },
      note: "Attendance shortage condonation appeal with medical documentation.",
    },
    {
      label: "⚡ Institutional OD Adjustment",
      fields: {
        reason: "Attendance recorded below threshold due to active participation in college-directed hackathons, accreditation exhibits, and sports events. Requesting adjustment of sanctioned On-Duty hours.",
      },
      note: "Departmental OD hours reconciliation request.",
    },
  ],

  "Permission for Special/Makeup Exam": [
    {
      label: "📝 Hospitalization During IA",
      fields: {
        reason: "Unable to appear for the scheduled Internal Assessment (IA) examination due to unforeseen hospitalization and clinical treatment. Requesting permission to appear for the makeup examination.",
      },
      note: "Makeup test request with doctor's emergency memo attached.",
    },
    {
      label: "🚆 Transit Delay / Emergency",
      fields: {
        reason: "Missed the morning examination due to railway transit disruption and unavoidable roadblock. Requesting approval for special test evaluation to safeguard academic scores.",
      },
      note: "Transit disruption makeup exam application.",
    },
  ],

  "Change of Elective Course": [
    {
      label: "🔄 Elective Stream Reassignment",
      fields: {
        reason: "Requesting reassignment of professional elective to better align with my final-year capstone project and technical career specialization. I have obtained consent from the course coordinator.",
      },
      note: "Elective course reallocation request.",
    },
  ],

  "Semester Break / Gap Year Request": [
    {
      label: "⏸️ Medical / Personal Semester Break",
      fields: {
        reason: "Applying for formal temporary semester leave / break on compassionate grounds due to ongoing medical rehabilitation. Undertaking to resume studies in the subsequent academic session per university statutes.",
      },
      note: "Formal semester hiatus request with medical board documentation.",
    },
  ],

  // ================= 2. CERTIFICATES & RECORDS =================
  "Request for Bonafide Certificate": [
    {
      label: "🎓 Education Loan",
      fields: {
        purpose: "Required for submission to Bank (State Bank of India / Canara Bank / HDFC) for education loan application sanction, interest subsidy, and direct institutional fee disbursement for the upcoming academic year.",
      },
      note: "Bank education loan bonafide letter verification.",
    },
    {
      label: "🛂 Passport / Police Verification",
      fields: {
        purpose: "Required as bonafide student status & institutional local residence verification proof for Passport Application at the Regional Passport Seva Kendra (PSK) and subsequent police station verification.",
      },
      note: "Passport Seva Kendra appointment document.",
    },
    {
      label: "🚌 BMTC / KSRTC Bus Pass",
      fields: {
        purpose: "Required for uploading to the Karnataka Seva Sindhu / BMTC portal for issuance of student concessional bus travel pass for daily commute between residence and SVIT campus.",
      },
      note: "Student concession bus pass verification.",
    },
    {
      label: "🪙 Scholarship (SSP / NSP)",
      fields: {
        purpose: "Required for document upload on the Karnataka State Scholarship Portal (SSP / e-Kalyan / NSP) for verification of bonafide admission status and post-matric tuition fee reimbursement.",
      },
      note: "Post-matric scholarship portal verification.",
    },
    {
      label: "🌍 Visa / International Travel",
      fields: {
        purpose: "Required for submission to the Embassy / Consulate General as institutional verification and 'No Objection' for student tourist/visitor visa processing during semester vacation.",
      },
      note: "Visa processing bonafide certification.",
    },
  ],

  "No Objection Certificate": [
    {
      label: "💼 Summer Internship NOC",
      fields: {
        academicYear: "2024-2028",
        purpose: "Requesting No Objection Certificate (NOC) to undergo technical industrial internship training during semester vacation / non-instructional working hours as required by the VTU curriculum.",
      },
      note: "Internship NOC. Corporate offer letter attached.",
    },
    {
      label: "🔬 Research Lab Collaboration",
      fields: {
        academicYear: "2024-2028",
        purpose: "Requesting NOC to carry out specialized research and final year capstone project experimentation at an external national research laboratory / public sector undertaking.",
      },
      note: "External research facility access NOC.",
    },
  ],

  "Study / Medium of Instruction Certificate": [
    {
      label: "🇬🇧 English Medium Verification",
      fields: {
        purpose: "Required as official proof certifying that the entire medium of instruction, course examination, and technical laboratory curriculum at SVIT is conducted exclusively in English.",
      },
      note: "Medium of instruction certificate for higher education / visa processing.",
    },
  ],

  "Character & Conduct Certificate": [
    {
      label: "📜 Good Moral Conduct Proof",
      fields: {
        purpose: "Required for submission to higher education university admission board / public sector employment authority certifying exemplary personal conduct and academic record.",
      },
      note: "Official character & conduct endorsement request.",
    },
  ],

  "Transcripts / Marks Card Attestation": [
    {
      label: "📑 VTU Grade Card Attestation",
      fields: {
        purpose: "Requesting institutional seal and official attestation on semester grade transcripts for WES evaluation / international graduate study application.",
      },
      note: "Transcripts attestation for foreign university credential evaluation.",
    },
  ],

  // ================= 3. FEES & FINANCIAL =================
  "Request for Education Loan Documents": [
    {
      label: "⏳ Tuition Fee Grace Period",
      fields: {
        purpose: "Humbly requesting a temporary grace period of 15-20 days for clearance of the outstanding semester tuition fees. Educational bank loan disbursement is currently under final underwriting. I undertake to clear all dues promptly upon bank credit.",
      },
      note: "Tuition fee payment extension request with bank sanction letter attached.",
    },
    {
      label: "📑 Detailed Fee Estimate Structure",
      fields: {
        purpose: "Requesting official institutional fee estimate breakdown on college letterhead (including Tuition Fee, VTU University Fee, Development Fee, and Laboratory Fee) for submission to bank loan officers / parental employer reimbursement.",
      },
      note: "Itemized fee breakdown statement for bank loan file.",
    },
  ],

  "Fee Payment Extension Request": [
    {
      label: "🗓️ 15-Day Fee Clearance Extension",
      fields: {
        reason: "Requesting a temporary extension of 15 days to clear the semester college fee dues. Family agricultural produce sales / loan disbursement has faced an unexpected delay. I assure clearance on or before the committed date.",
      },
      note: "Formal fee extension undertaking application.",
    },
  ],

  "Fee Concession / Scholarship Request": [
    {
      label: "🤝 Meritorious / Economic Concession",
      fields: {
        reason: "Applying for consideration under institutional economic hardship / merit-cum-means fee concession. Maintaining first-class academic standing and active participation in institutional projects.",
      },
      note: "Concession appeal supported by family income certificate.",
    },
  ],

  "Excess Fee Refund Application": [
    {
      label: "💳 Double Payment / Surplus Refund",
      fields: {
        reason: "An inadvertent duplicate transaction occurred during online fee portal payment / KEA seat allotment adjustment. Requesting reimbursement of the surplus excess amount to the remitting bank account.",
      },
      note: "Excess payment refund request with bank transaction receipts attached.",
    },
  ],

  "Bus / Transport Fee Receipt Request": [
    {
      label: "🚌 Transport Tax / Fee Receipt",
      fields: {
        purpose: "Requesting duplicate/official receipt for college bus transport fees paid for claiming corporate transport allowance and tax exemption under parent's employer.",
      },
      note: "College transport fee receipt requisition.",
    },
  ],

  // ================= 4. INTERNSHIPS & CAREER =================
  "Internship Permission": [
    {
      label: "🏢 8th-Sem Full-Time Internship",
      fields: {
        companyName: "Enterprise Software Corp",
        role: "Software Development Intern",
        stipend: "₹25,000 / month",
        purpose: "Selected through competitive campus placement for an 8th-semester industry internship. Requesting departmental approval and academic credit mapping as per VTU guidelines.",
      },
      note: "Full-time final-semester corporate internship clearance.",
    },
    {
      label: "💻 Virtual / Off-Hours Technical Internship",
      fields: {
        companyName: "Cloud Innovations Lab",
        role: "DevOps Engineer Trainee",
        stipend: "Unpaid / Academic Credit",
        purpose: "Requesting formal department endorsement for pursuing an off-hours virtual technical internship to acquire practical skills in cloud infrastructure.",
      },
      note: "Virtual internship endorsement request.",
    },
  ],

  "Placement On-Duty (OD) Request": [
    {
      label: "👔 Campus Drive Interview OD",
      fields: {
        reason: "Shortlisted for technical interviews and managerial rounds at the centralized campus placement drive. Requesting On-Duty (OD) attendance credit for the interview rounds.",
      },
      note: "Placement drive OD credit endorsed by Placement Cell call-letter.",
    },
  ],

  "Industrial Training Endorsement": [
    {
      label: "🏭 Core Engineering Industrial Visit",
      fields: {
        purpose: "Requesting institutional endorsement letter for completing mandatory 4-week core industrial practical training at an authorized PSU / manufacturing facility.",
      },
      note: "Industrial practical training endorsement letter.",
    },
  ],

  "Recommendation Letter (LOR)": [
    {
      label: "🎓 LOR for MS / Higher Studies",
      fields: {
        purpose: "Requesting an official Letter of Recommendation (LOR) from faculty / HOD evaluating academic performance, laboratory research acumen, and character for Master's degree admissions abroad.",
      },
      note: "Academic Letter of Recommendation request with curriculum vitae attached.",
    },
  ],

  "External Project / Workshop Clearance": [
    {
      label: "🛠️ Technical Hackathon / Workshop Pass",
      fields: {
        purpose: "Requesting departmental permission to attend an intensive weekend hands-on robotics / AI workshop at IISc / IIT. Undertaking to share learning with the department.",
      },
      note: "External technical workshop attendance clearance.",
    },
  ],

  // ================= 5. LIBRARY =================
  "Lost ID Card": [
    {
      label: "🪪 Lost RFID Smart ID Card",
      fields: {
        reason: "My student identification RFID smart card was misplaced during transit. Despite diligent effort, it could not be recovered. I have completed library dues clearance and request approval for issuance of a duplicate card.",
      },
      note: "Duplicate ID card application with fine payment receipt.",
    },
    {
      label: "⚡ Defective Chip / RFID Malfunction",
      fields: {
        reason: "The RFID embedded chip inside my student identity card has malfunctioned and is not reading at the biometric library turnstile. Requesting replacement smart card re-issuance.",
      },
      note: "Defective RFID card replacement request.",
    },
  ],

  "Book Due Date Extension & Fine Waiver": [
    {
      label: "📚 Exam Study Return Extension",
      fields: {
        reason: "Unable to return borrowed reference volumes on due date owing to examination preparation and health recovery. Requesting sympathetic waiver of late overdue fine and book renewal.",
      },
      note: "Library book renewal and fine waiver request.",
    },
  ],

  "Book Bank Scheme Enrollment": [
    {
      label: "📖 SC/ST / Merit Book Bank Requisition",
      fields: {
        purpose: "Applying for semester-long text book allocation under the institutional Book Bank scheme for complete semester reference and examination preparation.",
      },
      note: "Book Bank enrollment application.",
    },
  ],

  "No Dues Clearance Certificate": [
    {
      label: "✅ Final Library No-Dues Clearance",
      fields: {
        purpose: "All borrowed library books and reference manuals have been duly returned in good condition. Requesting official 'No Dues' clearance endorsement for semester exam hall ticket / graduation clearance.",
      },
      note: "Library No-Dues clearance request.",
    },
  ],

  "Inter-Library Borrowing Card Request": [
    {
      label: "🏛️ DELNET / Consortium Access Card",
      fields: {
        purpose: "Requesting access card / institutional credentials for DELNET / National Digital Library consortium to access peer-reviewed journals for final year capstone project literature review.",
      },
      note: "Consortium digital library access request.",
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
      label: "🏛️ Hostel Room Reallocation",
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

  "Hostel Admission & Room Change": [
    {
      label: "🛏️ Hostel Room Change / Medical Transfer",
      fields: {
        reason: "Requesting ground-floor / study room allocation in the college hostel on doctor's recommendation due to recent physical injury and study concentration.",
      },
      note: "Hostel room modification request.",
    },
  ],

  "College Bus Route Modification": [
    {
      label: "🚌 Permanent Bus Stop Relocation",
      fields: {
        reason: "Our family has relocated to a new residential address. Requesting authorization to board the college bus from the nearest designated route stop starting next week.",
      },
      note: "College transport stop modification request.",
    },
  ],

  "Campus Wi-Fi / Portal Access Issue": [
    {
      label: "📶 MAC Address Registration / Reset",
      fields: {
        reason: "Requesting registration of laptop MAC address on the campus secure Wi-Fi network and institutional proxy server for research and project work.",
      },
      note: "Campus IT Wi-Fi clearance request.",
    },
  ],

  "Sports & Cultural Activity Sanction": [
    {
      label: "🎭 Cultural Fest / Audition Clearance",
      fields: {
        reason: "Selected to participate in the VTU Inter-Collegiate Youth Fest / Technical Exhibition. Requesting sanction and department authorization.",
      },
      note: "Cultural / Sports institutional participation clearance.",
    },
  ],
};
