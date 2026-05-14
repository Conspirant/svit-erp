"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearClientSession } from "@/lib/clientApi";
import { Bell, Moon, Sun, Lock, Shield, HelpCircle, LogOut, Trash2, ChevronRight, Mail, X, CheckCircle2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [step, setStep] = useState(1); // 1: email, 2: mobile
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'

  const handleLogout = () => {
    clearClientSession();
    router.replace("/");
  };

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert("Local cache cleared successfully.");
    window.location.reload();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate fetching the masked phone number
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    
    try {
      await new Promise(r => setTimeout(r, 1500));
      if (phoneDigits.length === 4) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell native-screen fade-in" style={{ paddingBottom: "100px" }}>
      <div className="native-list">

        {/* Preferences */}
        <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: "16px 20px", background: "var(--surface-soft)", borderBottom: "1px solid var(--line)" }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Preferences</h2>
          </div>
          
          <div className="settings-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                <Bell size={20} color="var(--primary)" />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: "0.95rem" }}>Push Notifications</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Class alerts & updates</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="settings-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: "16px 20px" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                {darkMode ? <Moon size={20} color="var(--accent)" /> : <Sun size={20} color="var(--accent)" />}
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: "0.95rem" }}>Dark Theme</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>AMOLED optimized</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>
        </section>

        {/* Security & Account */}
        <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: "16px 20px", background: "var(--surface-soft)", borderBottom: "1px solid var(--line)" }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Security</h2>
          </div>

          <div className="settings-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: "16px 20px", borderBottom: "1px solid var(--line)", cursor: 'pointer' }} onClick={() => { setShowForgotModal(true); setStep(1); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                <Lock size={20} color="var(--ink)" />
              </div>
              <strong style={{ fontSize: "0.95rem" }}>Forgot Password</strong>
            </div>
            <ChevronRight size={18} color="var(--muted)" />
          </div>

          <div className="settings-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: "16px 20px", cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                <Shield size={20} color="var(--ink)" />
              </div>
              <strong style={{ fontSize: "0.95rem" }}>Privacy Policy</strong>
            </div>
            <ChevronRight size={18} color="var(--muted)" />
          </div>
        </section>

        {/* Support */}
        <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="settings-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: "16px 20px", borderBottom: "1px solid var(--line)", cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                <HelpCircle size={20} color="var(--ink)" />
              </div>
              <strong style={{ fontSize: "0.95rem" }}>Help & Support</strong>
            </div>
            <ChevronRight size={18} color="var(--muted)" />
          </div>
          
          <div className="settings-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: "16px 20px", borderBottom: "1px solid var(--line)", cursor: 'pointer' }} onClick={clearCache}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                <Trash2 size={20} color="var(--danger)" />
              </div>
              <strong style={{ fontSize: "0.95rem", color: "var(--danger)" }}>Clear Local Cache</strong>
            </div>
          </div>

          <div className="settings-item" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: "16px 20px", cursor: 'pointer' }} onClick={handleLogout}>
            <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
              <LogOut size={20} color="var(--danger)" />
            </div>
            <strong style={{ fontSize: "0.95rem", color: "var(--danger)" }}>Log Out</strong>
          </div>
        </section>

        <div style={{ textAlign: "center", marginTop: 24, marginBottom: 24 }}>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 700 }}>SVIT ERP v2.0.1</p>
          <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", marginTop: 4 }}>Built for students</p>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="panel fade-in" style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
            <button 
              onClick={() => { setShowForgotModal(false); setStatus(null); setEmail(""); setPhoneDigits(""); setStep(1); }}
              style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', color: 'var(--muted)' }}
            >
              <X size={24} />
            </button>

            {!status ? (
              step === 1 ? (
                <form onSubmit={handleEmailSubmit}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Forgot Credentials?</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 24 }}>Enter the Email-Id for which you want to recover the password.</p>
                  
                  <div className="field" style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 700 }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input 
                        type="email" 
                        className="input" 
                        placeholder="e.g. student@svit.in" 
                        style={{ paddingLeft: 44 }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="button full" disabled={loading}>
                    {loading ? "Checking..." : "Next"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleFinalSubmit}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Mobile verification</h3>
                  
                  <div className="field" style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)' }}>Enter your Email ID</label>
                    <div className="input" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
                       <Mail size={16} color="var(--muted)" /> {email}
                    </div>
                  </div>

                  <div className="field" style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 700 }}>Enter last four digit of your mobile number</label>
                    <p style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, letterSpacing: '0.1em' }}>831095XXXX</p>
                    <input 
                      type="tel" 
                      className="input" 
                      placeholder="e.g. 1234" 
                      maxLength={4}
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                    />
                  </div>

                  <button type="submit" className="button full" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Send"}
                  </button>
                  <button type="button" className="button full" style={{ marginTop: 12, background: 'transparent', border: '1px solid var(--line)' }} onClick={() => setStep(1)}>
                    Back
                  </button>
                </form>
              )
            ) : status === "success" ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={56} color="var(--success)" style={{ marginBottom: 16 }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Success</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Credentials were successfully sent to the registered email ID and mobile number.
                </p>
                <button 
                  className="button full" 
                  style={{ marginTop: 24 }}
                  onClick={() => { setShowForgotModal(false); setStatus(null); setEmail(""); }}
                >
                  Ok
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <AlertCircle size={56} color="var(--danger)" style={{ marginBottom: 16 }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: 'var(--danger)' }}>Error</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  The entered email ID is invalid or not registered in our system.
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 12 }}>
                  Please contact the admission department to verify your registered email.
                </p>
                <button 
                  className="button full" 
                  style={{ marginTop: 24, background: 'var(--surface-strong)', color: '#fff' }}
                  onClick={() => setStatus(null)}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .settings-item:hover { background: rgba(255,255,255,0.02); }
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .3s; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; }
        input:checked + .slider { background-color: var(--primary); }
        input:checked + .slider:before { transform: translateX(20px); }
        .slider.round { border-radius: 24px; }
        .slider.round:before { border-radius: 50%; }
      `}} />
    </main>
  );
}
