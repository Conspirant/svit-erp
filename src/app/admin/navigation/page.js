"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  IconCompass,
  IconNavigation,
  IconSwap,
  IconLayers,
  IconFootprints,
  IconClock,
  IconSearch,
  IconChevronRight,
  IconCamera,
  IconLock,
  IconUnlock,
  IconKey,
  IconLogOut,
  IconCheck,
  IconShare,
  IconQrCode,
} from "@/components/navigation/NavIcons";
import {
  FLOORS,
  CATEGORIES,
  DEFAULT_CAMPUS_DATA,
  loadCampusData,
  saveCampusData,
  resetCampusData,
  findShortestPath,
  generateTurnDirections,
  getFloorLabel,
} from "@/lib/campus-navigation/engine";
import { ADMIN_USNS } from "@/lib/marketplaceUtils";

// Dynamic imports with ssr: false ensures zero server-side delays
const CampusMapCanvas = dynamic(
  () => import("@/components/navigation/CampusMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "560px",
          borderRadius: "20px",
          background: "#080d1a",
          display: "grid",
          placeItems: "center",
          color: "#64748b",
          fontSize: "0.85rem",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Loading Campus Map Canvas...
      </div>
    ),
  }
);

const ARCameraOverlay = dynamic(
  () => import("@/components/navigation/ARCameraOverlay"),
  { ssr: false }
);

const ADMIN_SECRET_KEY = "svitadmin";

export default function AdminCampusNavigationPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");

  const [campusData, setCampusData] = useState(DEFAULT_CAMPUS_DATA);
  const [currentFloor, setCurrentFloor] = useState("ground");
  const [startNodeId, setStartNodeId] = useState("gate_main");
  const [targetNodeId, setTargetNodeId] = useState("f1_central_library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [isArActive, setIsArActive] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Check saved admin authorization on mount
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem("svit_admin_nav_authenticated");
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }

      const sessionData = sessionStorage.getItem("dashboard_data");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed?.profileUsn && ADMIN_USNS.includes(parsed.profileUsn.toUpperCase())) {
          setIsAuthenticated(true);
        }
      }

      const data = loadCampusData();
      setCampusData(data);
    } catch (err) {
      console.error("Auth check error:", err);
    }
  }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passcode.trim().toLowerCase() === ADMIN_SECRET_KEY.toLowerCase()) {
      setIsAuthenticated(true);
      try {
        localStorage.setItem("svit_admin_nav_authenticated", "true");
      } catch {}
      setAuthError("");
    } else {
      setAuthError("Invalid Admin Passcode. Try 'svitadmin'");
    }
  };

  const handleAdminLogout = () => {
    try {
      localStorage.removeItem("svit_admin_nav_authenticated");
    } catch {}
    setIsAuthenticated(false);
    setPasscode("");
  };

  const handleUpdateCampusData = (newData) => {
    setCampusData(newData);
    saveCampusData(newData);
  };

  const handleResetToFactory = () => {
    if (confirm("Reset campus map back to official SVIT layout?")) {
      const def = resetCampusData();
      setCampusData(def);
    }
  };

  const filteredNodes = useMemo(() => {
    let list = campusData.nodes.filter((n) => n.type !== "corridor");

    if (selectedCategory !== "all") {
      list = list.filter((n) => n.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.code.toLowerCase().includes(q) ||
          n.block.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [campusData.nodes, selectedCategory, searchQuery]);

  const activeRoute = useMemo(() => {
    if (!startNodeId || !targetNodeId) return null;
    return findShortestPath(startNodeId, targetNodeId, campusData.nodes, campusData.edges);
  }, [startNodeId, targetNodeId, campusData]);

  const turnDirections = useMemo(() => {
    if (!activeRoute || !activeRoute.pathNodes) return [];
    return generateTurnDirections(activeRoute.pathNodes);
  }, [activeRoute]);

  const startNode = useMemo(() => {
    return campusData.nodes.find((n) => n.id === startNodeId) || null;
  }, [campusData.nodes, startNodeId]);

  const targetNode = useMemo(() => {
    return campusData.nodes.find((n) => n.id === targetNodeId) || null;
  }, [campusData.nodes, targetNodeId]);

  const handleSelectNodeFromCanvas = (node, intent) => {
    if (intent === "start") {
      setStartNodeId(node.id);
    } else {
      setTargetNodeId(node.id);
      setCurrentFloor(node.floor);
    }
  };

  const handleSwapNodes = () => {
    const temp = startNodeId;
    setStartNodeId(targetNodeId);
    setTargetNodeId(temp);
  };

  const handleSelectDestination = (nodeId) => {
    setTargetNodeId(nodeId);
    const node = campusData.nodes.find((n) => n.id === nodeId);
    if (node) {
      setCurrentFloor(node.floor);
    }
    setSearchQuery("");
  };

  const handleShareRoute = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `${window.location.origin}/admin/navigation?from=${startNodeId}&to=${targetNodeId}`
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // 1. Admin Passcode Gate (Displayed immediately if unauthenticated)
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "radial-gradient(ellipse at 50% 30%, #0d1527 0%, #04060c 100%)",
          color: "#ffffff",
          padding: "20px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "400px",
            width: "100%",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.4) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px auto",
              boxShadow: "0 0 20px rgba(239, 68, 68, 0.25)",
            }}
          >
            <IconLock size={26} color="#ef4444" />
          </div>

          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              color: "#ef4444",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            RESTRICTED ADMIN ACCESS
          </span>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: "6px 0 8px 0" }}>
            SVIT CampusNav Studio
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 24px 0" }}>
            Campus mapping, indoor pathfinding, and AR vision systems are locked to administrative personnel only.
          </p>

          <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  color: "#94a3b8",
                }}
              >
                <IconKey size={18} color="#94a3b8" />
              </span>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Admin Passcode"
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: authError ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            {authError && (
              <span style={{ fontSize: "0.76rem", color: "#ef4444", textAlign: "left" }}>
                {authError}
              </span>
            )}

            <button
              type="submit"
              style={{
                marginTop: "6px",
                padding: "12px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "0.88rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(59, 130, 246, 0.4)",
              }}
            >
              Authenticate & Enter
            </button>
          </form>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Default pass: <code style={{ color: "#94a3b8" }}>svitadmin</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Full Admin Campus Navigation Interface
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060913",
        color: "#ffffff",
        padding: "24px 20px 60px 20px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#10b981",
              fontSize: "0.74rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <IconUnlock size={14} color="#10b981" />
            <span>ADMIN AUTHORIZED</span>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>
            SVIT Indoor Wayfinding & AR Studio
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={handleShareRoute}
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#cbd5e1",
              fontSize: "0.76rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {copiedLink ? <IconCheck size={14} color="#10b981" /> : <IconShare size={14} color="#cbd5e1" />}
            <span>{copiedLink ? "Link Copied" : "Share"}</span>
          </button>
          <button
            type="button"
            onClick={handleAdminLogout}
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              fontSize: "0.76rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <IconLogOut size={14} color="#f87171" />
            <span>Lock & Exit</span>
          </button>
        </div>
      </div>

      {/* Route Selector Strip (Start / Destination) */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: "18px",
          padding: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "10px", alignItems: "center" }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              Starting Point
            </label>
            <select
              value={startNodeId}
              onChange={(e) => setStartNodeId(e.target.value)}
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                outline: "none",
              }}
            >
              {campusData.nodes
                .filter((n) => n.type !== "corridor")
                .map((node) => (
                  <option key={node.id} value={node.id} style={{ background: "#0f172a", color: "#fff" }}>
                    {node.name} ({getFloorLabel(node.floor)})
                  </option>
                ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwapNodes}
            style={{
              marginTop: "18px",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#38bdf8",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            title="Swap Start & Destination"
          >
            <IconSwap size={16} color="#38bdf8" />
          </button>

          <div>
            <label style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
              Destination
            </label>
            <select
              value={targetNodeId}
              onChange={(e) => handleSelectDestination(e.target.value)}
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                outline: "none",
              }}
            >
              {campusData.nodes
                .filter((n) => n.type !== "corridor")
                .map((node) => (
                  <option key={node.id} value={node.id} style={{ background: "#0f172a", color: "#fff" }}>
                    {node.name} ({getFloorLabel(node.floor)})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Route Stats & Launch AR */}
        {activeRoute && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "10px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <IconFootprints size={16} color="#10b981" />
                <span style={{ fontSize: "0.82rem", color: "#ffffff", fontWeight: 800 }}>
                  {activeRoute.totalDistanceMeters} meters
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <IconClock size={16} color="#38bdf8" />
                <span style={{ fontSize: "0.82rem", color: "#ffffff", fontWeight: 800 }}>
                  ~{Math.ceil(activeRoute.estimatedTimeSecs / 60)} min walk
                </span>
              </div>
              {activeRoute.floorTransitions.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <IconLayers size={16} color="#c084fc" />
                  <span style={{ fontSize: "0.82rem", color: "#c084fc", fontWeight: 700 }}>
                    {activeRoute.floorTransitions.length} level change ({activeRoute.floorTransitions.map((f) => f.atNode.name).join(", ")})
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIsArActive(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <IconCamera size={14} color="#ffffff" />
                <span>Launch AR Vision</span>
              </button>

              {isEditorOpen && (
                <button
                  type="button"
                  onClick={handleResetToFactory}
                  style={{
                    fontSize: "0.72rem",
                    padding: "4px 8px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Reset Factory Map
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search Bar & Filters */}
      <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <IconSearch size={18} color="#94a3b8" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classrooms, labs, offices, canteen, library..."
            style={{
              width: "100%",
              padding: "12px 14px 12px 42px",
              borderRadius: "14px",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              fontSize: "0.88rem",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {CATEGORIES.map((cat) => {
            const isSel = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: isSel ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
                  background: isSel ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  color: isSel ? "#60a5fa" : "#94a3b8",
                  fontSize: "0.76rem",
                  fontWeight: isSel ? 800 : 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {searchQuery.trim() && (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(16px)",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              maxHeight: "220px",
              overflowY: "auto",
              padding: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
            }}
          >
            {filteredNodes.length > 0 ? (
              filteredNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleSelectDestination(node.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: targetNodeId === node.id ? "rgba(59, 130, 246, 0.25)" : "transparent",
                    border: "none",
                    color: "#fff",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, display: "block" }}>
                      {node.name}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>
                      {node.block} · {getFloorLabel(node.floor)}
                    </span>
                  </div>
                  <IconChevronRight size={16} color="#94a3b8" />
                </button>
              ))
            ) : (
              <p style={{ margin: "12px", fontSize: "0.8rem", color: "#94a3b8", textAlign: "center" }}>
                No rooms match &quot;{searchQuery}&quot;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Interactive Map Canvas (Dynamic Client Component) */}
      <div style={{ marginBottom: "20px" }}>
        <CampusMapCanvas
          campusData={campusData}
          currentFloor={currentFloor}
          onChangeFloor={setCurrentFloor}
          startNodeId={startNodeId}
          targetNodeId={targetNodeId}
          activeRoute={activeRoute}
          onSelectNode={handleSelectNodeFromCanvas}
          onUpdateCampusData={handleUpdateCampusData}
          isEditorOpen={isEditorOpen}
          setIsEditorOpen={setIsEditorOpen}
        />
      </div>

      {/* Turn-by-Turn Guidance Steps */}
      {turnDirections.length > 0 && (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(12px)",
            borderRadius: "18px",
            padding: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IconNavigation size={18} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#fff" }}>
                Turn-by-Turn Walking Directions
              </h3>
            </div>
            <span style={{ fontSize: "0.76rem", color: "#94a3b8", fontWeight: 600 }}>
              {turnDirections.length} Steps
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {turnDirections.map((dir, idx) => {
              const isSelected = activeStepIndex === idx;
              return (
                <div
                  key={dir.step}
                  onClick={() => {
                    setActiveStepIndex(idx);
                    if (dir.floor) setCurrentFloor(dir.floor);
                  }}
                  style={{
                    display: "flex",
                    gap: "14px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: isSelected ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    border: isSelected ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                    cursor: "pointer",
                    transition: "all 120ms ease",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: isSelected ? "#3b82f6" : "rgba(255, 255, 255, 0.08)",
                      color: "#fff",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {dir.step}
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 2px 0", fontSize: "0.88rem", fontWeight: 800, color: "#ffffff" }}>
                      {dir.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.4 }}>
                      {dir.instruction}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live AR Vision Overlay */}
      {isArActive && (
        <ARCameraOverlay
          onClose={() => setIsArActive(false)}
          activeRoute={activeRoute}
          currentNode={startNode}
          targetNode={targetNode}
          onScanCheckpoint={(node) => {
            setStartNodeId(node.id);
            setCurrentFloor(node.floor);
          }}
          allNodes={campusData.nodes}
        />
      )}
    </div>
  );
}
