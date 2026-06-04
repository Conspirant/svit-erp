"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const DEPARTMENTS = [
  { value: "computer-science-and-engineering", label: "Computer Science & Engineering" },
  { value: "data-science", label: "CSE (Data Science)" },
  { value: "artificial-intelligence-and-machine-learning", label: "CSE (AI & ML)" },
  { value: "information-science-and-engineering", label: "Information Science & Engineering" },
  { value: "electronics-and-communication-engineering", label: "Electronics & Communication Engineering" },
  { value: "civil-engineering", label: "Civil Engineering" },
  { value: "mechanical-engineering", label: "Mechanical Engineering" },
  { value: "master-of-business-administration", label: "MBA" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "mathematics", label: "Mathematics" },
];

const mapStudentDeptToSlug = (dept) => {
  if (!dept) return "computer-science-and-engineering";
  let normalized = dept.toUpperCase().trim();
  if (normalized.startsWith("B.E-")) normalized = normalized.replace("B.E-", "");
  if (normalized.startsWith("B.E ")) normalized = normalized.replace("B.E ", "");
  
  const map = {
    "CS": "computer-science-and-engineering",
    "CD": "data-science",
    "EC": "electronics-and-communication-engineering",
    "ME": "mechanical-engineering",
    "CV": "civil-engineering",
    "IS": "information-science-and-engineering",
    "AI": "artificial-intelligence-and-machine-learning",
    "CI": "artificial-intelligence-and-machine-learning",
    "CSE": "computer-science-and-engineering",
    "CSE(DS)": "data-science",
    "CSE(AI&ML)": "artificial-intelligence-and-machine-learning",
    "MBA": "master-of-business-administration",
    "CHEMISTRY": "chemistry",
    "PHYSICS": "physics",
    "MATHEMATICS": "mathematics",
  };
  
  if (map[normalized]) return map[normalized];
  
  if (normalized.includes("DATA SCIENCE") || normalized.includes("DS")) return "data-science";
  if (normalized.includes("ARTIFICIAL") || normalized.includes("AIML") || normalized.includes("A.I") || normalized.includes("MACHINE")) return "artificial-intelligence-and-machine-learning";
  if (normalized.includes("COMPUTER") || normalized.includes("CSE") || normalized.includes("CS")) return "computer-science-and-engineering";
  if (normalized.includes("INFORMATION") || normalized.includes("ISE") || normalized.includes("IS")) return "information-science-and-engineering";
  if (normalized.includes("ELECTRONICS") || normalized.includes("ECE") || normalized.includes("EC")) return "electronics-and-communication-engineering";
  if (normalized.includes("CIVIL") || normalized.includes("CV")) return "civil-engineering";
  if (normalized.includes("MECHANICAL") || normalized.includes("ME")) return "mechanical-engineering";
  if (normalized.includes("BUSINESS") || normalized.includes("MBA")) return "master-of-business-administration";
  
  return "computer-science-and-engineering";
};

export default function StudentInfo() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Faculty state
  const [selectedDept, setSelectedDept] = useState("");
  const [facultyList, setFacultyList] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [facultyError, setFacultyError] = useState("");

  // Drawer / research profile state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [profileDetail, setProfileDetail] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [activeTab, setActiveTab] = useState("publications");
  const [pubQuery, setPubQuery] = useState("");

  // Load student profile
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const cached = sessionStorage.getItem('profile_data');
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch { }
    });

    const fetchInfo = async () => {
      try {
        const res = await fetch("/api/student/profile");
        if (res.status === 401) {
          router.push("/");
          return;
        }

        const json = await res.json();
        if (json.success) {
          setData(json.data);
          try { sessionStorage.setItem('profile_data', JSON.stringify(json.data)); } catch { }
        } else {
          setError(json.error || "Failed to load profile data.");
        }
      } catch (err) {
        setError("Could not connect to the ERP server.");
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [router]);

  // Set default department slug from student profile
  useEffect(() => {
    if (data && data.department && !selectedDept) {
      setSelectedDept(mapStudentDeptToSlug(data.department));
    }
  }, [data, selectedDept]);

  // Load faculty list when selected department changes
  useEffect(() => {
    if (!selectedDept) return;

    const fetchFaculty = async () => {
      setLoadingFaculty(true);
      setFacultyError("");
      try {
        const res = await fetch(`/api/faculty/list?slug=${selectedDept}`);
        const json = await res.json();
        if (json.success) {
          setFacultyList(json.data);
        } else {
          setFacultyError(json.error || "Failed to load faculty list.");
        }
      } catch (err) {
        setFacultyError("Failed to fetch faculty list.");
      } finally {
        setLoadingFaculty(false);
      }
    };

    fetchFaculty();
  }, [selectedDept]);

  // Handle viewing detailed research profile (IRINS scraping)
  const handleViewProfile = async (faculty) => {
    setSelectedFaculty(faculty);
    setDrawerOpen(true);
    setLoadingProfile(true);
    setProfileDetail(null);
    setProfileError("");
    setActiveTab("publications");
    setPubQuery("");

    if (!faculty.expertId) {
      setProfileError("This faculty member does not have a linked IRINS research profile.");
      setLoadingProfile(false);
      return;
    }

    try {
      const res = await fetch(`/api/faculty/profile?expertId=${faculty.expertId}`);
      const json = await res.json();
      if (json.success) {
        setProfileDetail(json.data);
      } else {
        setProfileError(json.error || "Failed to load research profile details.");
      }
    } catch (err) {
      setProfileError("Could not retrieve research data. Please try again.");
    } finally {
      setLoadingProfile(false);
    }
  };

  // Filtered publications
  const filteredPublications = useMemo(() => {
    if (!profileDetail || !profileDetail.publications) return [];
    if (!pubQuery.trim()) return profileDetail.publications;
    const q = pubQuery.toLowerCase();
    return profileDetail.publications.filter(p => 
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.authors && p.authors.toLowerCase().includes(q)) ||
      (p.type && p.type.toLowerCase().includes(q)) ||
      (p.year && p.year.includes(q))
    );
  }, [profileDetail, pubQuery]);

  if (loading) {
    return (
      <div className="center-state">
        <div className="loader" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-state">
        <div className="auth-card" style={{ maxWidth: 460, textAlign: "center" }}>
          <p className="eyebrow">Profile unavailable</p>
          <h1 className="title">Could not load profile</h1>
          <p className="subtle" style={{ marginTop: 12 }}>{error}</p>
          <button onClick={() => router.push("/")} className="button" style={{ marginTop: 22 }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell fade-in">
      <header className="app-header">
        <div>
          <p className="eyebrow">Student details</p>
          <h1 className="title">Your Profile</h1>
          <p className="subtle" style={{ marginTop: 8 }}>
            Basic details and academic enrollment information extracted from ERP.
          </p>
        </div>
        <button onClick={() => router.push("/")} className="button secondary">
          Logout
        </button>
      </header>

      <nav className="tabs" aria-label="Dashboard sections">
        <Link className="tab" href="/dashboard">Overview</Link>
        <Link className="tab" href="/dashboard/marketplace">Marketplace</Link>
        <Link className="tab" href="/dashboard/events">Calendar</Link>
        <Link className="tab" href="/dashboard/timetable">Timetable</Link>
        <Link className="tab active" href="/dashboard/info">Profile</Link>
        <Link className="tab" href="/dashboard/bunk">Bunk Planner</Link>
        <Link className="tab" href="/dashboard/connect">Connect</Link>
      </nav>

      <section className="grid" style={{ maxWidth: 1100, width: "100%" }}>
        {/* Basic Information Panel */}
        <article className="panel span-12">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Basic Information</h2>
              <p className="subtle">Extracted from your current ERP session</p>
            </div>
            <div className="avatar-placeholder" style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: "bold", color: "var(--subtle-color)" }}>
              {data?.name ? data.name.charAt(0).toUpperCase() : "?"}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "16px" }}>
            <div className="soft-box">
              <p className="eyebrow">Name</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.name || "Unknown"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">USN</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4, color: "var(--primary)" }}>
                {data?.usn || "Not found"}
              </strong>
            </div>

            <div className="soft-box" style={{ gridColumn: "1 / -1" }}>
              <p className="eyebrow">Department</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.department || "Not specified"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Semester</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.semester ? `Semester ${data.semester}` : "Unknown"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Quota</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.quota || "-"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Category Alloted</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.categoryalloted || "-"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Category Claimed</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4 }}>
                {data?.categoryclaimed || "-"}
              </strong>
            </div>

            <div className="soft-box">
              <p className="eyebrow">Last Year Due</p>
              <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4, color: data?.lastyeardue && data.lastyeardue !== '0' ? "var(--danger)" : "inherit" }}>
                {data?.lastyeardue ? `₹${data.lastyeardue}` : "-"}
              </strong>
            </div>
          </div>
        </article>

        {/* Faculty Directory Panel */}
        <article className="panel span-12" style={{ marginTop: "12px" }}>
          <div className="faculty-filter-wrap">
            <div>
              <h2 className="panel-title">Faculty Directory</h2>
              <p className="subtle">Explore the academic staff and research achievements of the college.</p>
            </div>
            
            <select 
              className="faculty-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

          {loadingFaculty ? (
            <div className="faculty-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div className="skeleton-pulse" style={{ width: "64px", height: "64px", borderRadius: "50%" }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton-pulse skeleton-text" style={{ width: "80%" }} />
                      <div className="skeleton-pulse skeleton-text short" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <div className="skeleton-pulse" style={{ flex: 1, height: "36px", borderRadius: "6px" }} />
                    <div className="skeleton-pulse" style={{ width: "36px", height: "36px", borderRadius: "6px" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : facultyError ? (
            <div className="notice error">
              <strong>Error Loading Directory:</strong> {facultyError}
            </div>
          ) : facultyList.length === 0 ? (
            <p className="subtle" style={{ textAlign: "center", padding: "20px 0" }}>No faculty members found for this department.</p>
          ) : (
            <div className="faculty-grid">
              {facultyList.map((fac, idx) => (
                <div className="faculty-card" key={idx}>
                  <div className="faculty-card-header">
                    <div className="faculty-avatar-container">
                      <img 
                        className="faculty-avatar" 
                        src={fac.image} 
                        alt={fac.name} 
                        onError={(e) => {
                          e.target.src = "https://saividya.ac.in/assets/images/faculty/empty.jpg";
                        }}
                      />
                    </div>
                    <div className="faculty-meta">
                      <h3 className="faculty-name" title={fac.name}>{fac.name}</h3>
                      <span className="faculty-designation">{fac.designation}</span>
                    </div>
                  </div>
                  
                  <div className="faculty-actions">
                    <button 
                      className="faculty-btn primary"
                      onClick={() => handleViewProfile(fac)}
                    >
                      View Research Profile
                    </button>
                    {fac.linkedin && (
                      <a 
                        className="faculty-linkedin-btn" 
                        href={fac.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="LinkedIn Profile"
                      >
                        in
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* Sliding Research Profile Drawer */}
      <div 
        className={`drawer-overlay ${drawerOpen ? 'active' : ''}`}
        onClick={() => setDrawerOpen(false)}
      >
        <div 
          className="profile-drawer"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="drawer-header">
            <div className="drawer-header-content">
              <h2 className="drawer-title">{selectedFaculty?.name || "Faculty Profile"}</h2>
              <p className="drawer-subtitle">
                {selectedFaculty?.designation}
                {profileDetail?.organization && ` · ${profileDetail.organization}`}
              </p>
            </div>
            <button 
              className="drawer-close-btn"
              onClick={() => setDrawerOpen(false)}
            >
              &times;
            </button>
          </header>

          <div className="drawer-body">
            {loadingProfile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "10px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton-pulse" style={{ height: "60px", borderRadius: "8px" }} />
                  ))}
                </div>
                <div className="skeleton-pulse" style={{ height: "40px", borderRadius: "8px" }} />
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-pulse skeleton-text" style={{ width: "90%" }} />
                    <div className="skeleton-pulse skeleton-text short" />
                  </div>
                ))}
              </div>
            ) : profileError ? (
              <div style={{ padding: "10px 0" }}>
                <div className="notice error">
                  {profileError}
                </div>
                {selectedFaculty?.irinsUrl && (
                  <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p className="subtle" style={{ fontSize: "0.82rem" }}>You can view the original profile directly on the IRINS portal:</p>
                    <a 
                      href={selectedFaculty.irinsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="button secondary"
                      style={{ width: "100%", textAlign: "center" }}
                    >
                      Open IRINS Portal
                    </a>
                  </div>
                )}
              </div>
            ) : profileDetail ? (
              <>
                {/* Metrics Stats Grid */}
                {profileDetail.citations && profileDetail.citations.length > 0 && (
                  <div className="metrics-grid">
                    {profileDetail.citations.slice(0, 3).map((cit, i) => {
                      const parts = cit.split(' ');
                      const val = parts[0];
                      const lbl = parts.slice(1).join(' ');
                      return (
                        <div className="metric-box" key={i}>
                          <span className="metric-val">{val}</span>
                          <span className="metric-lbl">{lbl}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Section Tabs */}
                <div className="drawer-tabs">
                  <span 
                    className={`drawer-tab ${activeTab === 'publications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('publications')}
                  >
                    Publications ({profileDetail.publications?.length || 0})
                  </span>
                  <span 
                    className={`drawer-tab ${activeTab === 'projects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('projects')}
                  >
                    Projects & Patents ({ (profileDetail.projects?.length || 0) + (profileDetail.patents?.length || 0) })
                  </span>
                  <span 
                    className={`drawer-tab ${activeTab === 'experience' ? 'active' : ''}`}
                    onClick={() => setActiveTab('experience')}
                  >
                    Timeline
                  </span>
                  <span 
                    className={`drawer-tab ${activeTab === 'expertise' ? 'active' : ''}`}
                    onClick={() => setActiveTab('expertise')}
                  >
                    Expertise
                  </span>
                </div>

                {/* Tab content panel */}
                <div className="tab-content-panel">
                  
                  {activeTab === 'publications' && (
                    <>
                      {profileDetail.publications && profileDetail.publications.length > 0 && (
                        <div className="publications-search-wrap">
                          <input 
                            type="text" 
                            className="publications-search"
                            placeholder="Filter research publications by title, author, year..."
                            value={pubQuery}
                            onChange={(e) => setPubQuery(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="publications-list">
                        {filteredPublications.length === 0 ? (
                          <p className="subtle" style={{ textAlign: "center", padding: "10px 0", fontSize: "0.85rem" }}>
                            {profileDetail.publications && profileDetail.publications.length > 0 ? "No publications match your query." : "No publications loaded."}
                          </p>
                        ) : (
                          filteredPublications.map((pub, idx) => (
                            <div className="publication-item" key={idx}>
                              <h4 className="pub-title">{pub.title}</h4>
                              <p className="pub-authors">{pub.authors}</p>
                              <div className="pub-meta">
                                {pub.type && <span className="pub-badge">{pub.type}</span>}
                                {pub.year && <span style={{ opacity: 0.8 }}>Year: {pub.year}</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {activeTab === 'projects' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Projects Section */}
                      <div>
                        <h4 className="eyebrow" style={{ marginBottom: "8px" }}>Research Projects</h4>
                        {profileDetail.projects && profileDetail.projects.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {profileDetail.projects.map((proj, idx) => (
                              <div className="project-card" key={idx}>
                                <h5 className="project-title">{proj.title}</h5>
                                {proj.funding && <p className="project-funding">{proj.funding}</p>}
                                {proj.details && <p className="project-details">{proj.details}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="subtle" style={{ fontSize: "0.8rem", paddingLeft: "4px" }}>No research projects registered.</p>
                        )}
                      </div>

                      {/* Patents Section */}
                      <div style={{ marginTop: "8px" }}>
                        <h4 className="eyebrow" style={{ marginBottom: "8px" }}>Patents</h4>
                        {profileDetail.patents && profileDetail.patents.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {profileDetail.patents.map((pat, idx) => (
                              <div className="project-card" key={idx}>
                                <h5 className="project-title">{pat.title}</h5>
                                {pat.authors && <p className="project-details" style={{ fontWeight: 700, marginBottom: "4px" }}>Inventor: {pat.authors}</p>}
                                {pat.details && <p className="project-details">{pat.details}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="subtle" style={{ fontSize: "0.8rem", paddingLeft: "4px" }}>No patents registered.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'experience' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {/* Qualifications Timeline */}
                      <div>
                        <h4 className="eyebrow" style={{ marginBottom: "12px" }}>Academic Qualifications</h4>
                        {profileDetail.qualifications && profileDetail.qualifications.length > 0 ? (
                          <div className="timeline">
                            {profileDetail.qualifications.map((qual, idx) => {
                              const match = qual.match(/^(\d{4})\s+(.+)/);
                              const year = match ? match[1] : '';
                              const desc = match ? match[2] : qual;
                              return (
                                <div className="timeline-item" key={idx}>
                                  <div className="timeline-dot" />
                                  {year && <span className="timeline-time">{year}</span>}
                                  <div className="timeline-title">{desc}</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="subtle" style={{ fontSize: "0.8rem", paddingLeft: "4px" }}>No qualifications registered.</p>
                        )}
                      </div>

                      {/* Experiences Timeline */}
                      <div style={{ marginTop: "10px" }}>
                        <h4 className="eyebrow" style={{ marginBottom: "12px" }}>Work Experience</h4>
                        {profileDetail.experiences && profileDetail.experiences.length > 0 ? (
                          <div className="timeline">
                            {profileDetail.experiences.map((exp, idx) => {
                              const match = exp.match(/^(\d{4}\s*-\s*(?:Present|\d{4}))\s+(.+)/i);
                              const time = match ? match[1] : '';
                              const desc = match ? match[2] : exp;
                              return (
                                <div className="timeline-item" key={idx}>
                                  <div className="timeline-dot" style={{ background: "var(--accent)" }} />
                                  {time && <span className="timeline-time" style={{ color: "var(--primary)" }}>{time}</span>}
                                  <div className="timeline-title">{desc}</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="subtle" style={{ fontSize: "0.8rem", paddingLeft: "4px" }}>No work experience registered.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'expertise' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {/* Expertise tags */}
                      <div>
                        <h4 className="eyebrow" style={{ marginBottom: "12px" }}>Areas of Expertise</h4>
                        {profileDetail.expertise && profileDetail.expertise.length > 0 ? (
                          <div className="badge-container">
                            {profileDetail.expertise.map((exp, idx) => (
                              <span className="badge-item highlight" key={idx}>{exp}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="subtle" style={{ fontSize: "0.8rem", paddingLeft: "4px" }}>No expertise fields registered.</p>
                        )}
                      </div>

                      {/* Awards and Honours */}
                      <div style={{ marginTop: "8px" }}>
                        <h4 className="eyebrow" style={{ marginBottom: "12px" }}>Honours & Awards</h4>
                        {profileDetail.awards && profileDetail.awards.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {profileDetail.awards.map((award, idx) => (
                              <div className="project-card" key={idx}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px", gap: "12px" }}>
                                  <h5 className="project-title" style={{ margin: 0 }}>{award.title}</h5>
                                  {award.year && <span className="eyebrow" style={{ fontSize: "0.68rem" }}>{award.year}</span>}
                                </div>
                                {award.description && <p className="project-details" style={{ margin: 0 }}>{award.description}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="subtle" style={{ fontSize: "0.8rem", paddingLeft: "4px" }}>No awards registered.</p>
                        )}
                      </div>

                      {/* Professional Memberships */}
                      <div style={{ marginTop: "8px" }}>
                        <h4 className="eyebrow" style={{ marginBottom: "12px" }}>Professional Memberships</h4>
                        {profileDetail.memberships && profileDetail.memberships.length > 0 ? (
                          <div className="badge-container">
                            {profileDetail.memberships.map((mem, idx) => (
                              <span className="badge-item" key={idx}>
                                {mem.title} {mem.year && `(${mem.year})`} {mem.type && `· ${mem.type}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="subtle" style={{ fontSize: "0.8rem", paddingLeft: "4px" }}>No memberships registered.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Direct link button */}
                  {selectedFaculty?.irinsUrl && (
                    <a 
                      href={selectedFaculty.irinsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="button secondary"
                      style={{ width: "100%", textAlign: "center", marginTop: "16px", minHeight: "40px" }}
                    >
                      View Full Profile on IRINS Portal
                    </a>
                  )}

                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

