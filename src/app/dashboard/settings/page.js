"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearClientSession } from "@/lib/clientApi";
import { Bell, Moon, Sun, Lock, Shield, HelpCircle, LogOut, Trash2, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

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

          <div className="settings-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: "16px 20px", borderBottom: "1px solid var(--line)", cursor: 'pointer' }} onClick={() => alert("Password changes must be done through the main university portal.")}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                <Lock size={20} color="var(--ink)" />
              </div>
              <strong style={{ fontSize: "0.95rem" }}>Change Password</strong>
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
