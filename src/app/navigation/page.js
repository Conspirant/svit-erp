"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  IconCompass,
  IconNavigation,
  IconSwap,
  IconLayers,
  IconFootprints,
  IconClock,
  IconSearch,
  IconCamera,
  IconLock,
  IconCheck,
  IconShare,
  IconChevronRight,
  IconMapPin,
  IconGraduationCap,
  IconLaptop,
  IconUtensils,
  IconCoffee,
  IconBookOpen,
} from "@/components/navigation/NavIcons";
import {
  FLOORS,
  CATEGORIES,
  DEFAULT_CAMPUS_DATA,
  loadCampusData,
  findShortestPath,
  generateTurnDirections,
  getFloorLabel,
} from "@/lib/campus-navigation/engine";

const CampusMapCanvas = dynamic(
  () => import("@/components/navigation/CampusMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "600px",
          borderRadius: "20px",
          background: "#080d1a",
          display: "grid",
          placeItems: "center",
          color: "#64748b",
          fontSize: "0.85rem",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Loading SVIT Campus Map Canvas...
      </div>
    ),
  }
);

const ARCameraOverlay = dynamic(
  () => import("@/components/navigation/ARCameraOverlay"),
  { ssr: false }
);

export default function StudentCampusNavigationPage() {
  const [campusData, setCampusData] = useState(DEFAULT_CAMPUS_DATA);
  const [currentFloor, setCurrentFloor] = useState("ground");
  const [startNodeId, setStartNodeId] = useState("gate_main");
  const [targetNodeId, setTargetNodeId] = useState("f1_central_library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isArActive, setIsArActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load campus data from local storage on mount
  useEffect(() => {
    try {
      const data = loadCampusData();
      setCampusData(data);
    } catch (err) {
      console.error("Failed to load campus data:", err);
    }
  }, []);

  // Compute active navigation path
  const activeRoute = useMemo(() => {
    return findShortestPath(startNodeId, targetNodeId, campusData.nodes, campusData.edges);
  }, [startNodeId, targetNodeId, campusData]);

  // Turn directions
  const turnDirections = useMemo(() => {
    if (!activeRoute || !activeRoute.pathNodes) return [];
    return generateTurnDirections(activeRoute.pathNodes);
  }, [activeRoute]);

  // Filter searchable locations (both rooms and graph nodes)
  const filteredDestinations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const rooms = campusData.rooms || [];

    return campusData.nodes.filter((n) => {
      // Category filter
      if (selectedCategory !== "all" && n.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        n.name.toLowerCase().includes(q) ||
        (n.code && n.code.toLowerCase().includes(q)) ||
        (n.block && n.block.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [campusData.nodes, campusData.rooms, searchQuery, selectedCategory]);

  const startNodeObj = useMemo(
    () => campusData.nodes.find((n) => n.id === startNodeId),
    [campusData.nodes, startNodeId]
  );
  const targetNodeObj = useMemo(
    () => campusData.nodes.find((n) => n.id === targetNodeId),
    [campusData.nodes, targetNodeId]
  );

  // Auto-switch to destination's floor when selected
  const handleSelectDestination = (nodeId) => {
    setTargetNodeId(nodeId);
    const node = campusData.nodes.find((n) => n.id === nodeId);
    if (node && node.floor) {
      setCurrentFloor(node.floor);
    }
  };

  const handleSwapPoints = () => {
    const temp = startNodeId;
    setStartNodeId(targetNodeId);
    setTargetNodeId(temp);
  };

  const handleShareRoute = () => {
    try {
      const url = `${window.location.origin}/navigation?from=${startNodeId}&to=${targetNodeId}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060913",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* HEADER / NAVIGATION BAR */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 15, 29, 0.8)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(6, 182, 212, 0.4)",
              }}
            >
              <IconCompass size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900, letterSpacing: "-0.01em" }}>
                  SVIT Campus Navigator
                </h1>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    fontWeight: 700,
                  }}
                >
                  LIVE GPS & MAP
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "#94a3b8" }}>
                Sai Vidya Institute of Technology · Rajanukunte, Bangalore
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleShareRoute}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {copiedLink ? <IconCheck size={14} color="#10b981" /> : <IconShare size={14} />}
              {copiedLink ? "Link Copied!" : "Share Route"}
            </button>

            <Link
              href="/admin/navigation"
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                color: "#60a5fa",
                fontSize: "0.8rem",
                fontWeight: 700,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IconLock size={14} />
              Admin Studio
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "20px",
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: "24px",
        }}
      >
        {/* LEFT COLUMN: ROUTE PLANNER & SEARCH */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Quick Route Selector Card */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "18px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#38bdf8", letterSpacing: "0.05em" }}>
                ROUTE PLANNER
              </span>
              <button
                type="button"
                onClick={handleSwapPoints}
                title="Swap Start & Destination"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "none",
                  color: "#cbd5e1",
                  borderRadius: "8px",
                  padding: "5px",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconSwap size={16} />
              </button>
            </div>

            {/* Start Node Input */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                STARTING FROM:
              </label>
              <select
                value={startNodeId}
                onChange={(e) => setStartNodeId(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "5px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "#090d16",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  outline: "none",
                }}
              >
                {campusData.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({getFloorLabel(n.floor)})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Node Input */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                DESTINATION:
              </label>
              <select
                value={targetNodeId}
                onChange={(e) => handleSelectDestination(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "5px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "#090d16",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  outline: "none",
                }}
              >
                {campusData.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({getFloorLabel(n.floor)})
                  </option>
                ))}
              </select>
            </div>

            {/* Route Metrics Pill */}
            {activeRoute && (
              <div
                style={{
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#67e8f9", fontWeight: 700 }}>WALKING DISTANCE</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                    <IconFootprints size={18} color="#06b6d4" />
                    {activeRoute.totalDistanceMeters} meters
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.7rem", color: "#67e8f9", fontWeight: 700 }}>EST. TIME</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                    <IconClock size={18} color="#06b6d4" />
                    ~{Math.ceil(activeRoute.estimatedTimeSecs / 60)} min
                  </div>
                </div>
              </div>
            )}

            {/* AR Live Camera Button */}
            <button
              type="button"
              onClick={() => setIsArActive(true)}
              style={{
                width: "100%",
                marginTop: "14px",
                padding: "12px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "0.88rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(6, 182, 212, 0.35)",
              }}
            >
              <IconCamera size={18} />
              Launch AR Live Navigation
            </button>
          </div>

          {/* Search & Location Catalog */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "18px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Search Box */}
            <div
              style={{
                position: "relative",
                marginBottom: "12px",
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms, labs, HODs, canteen..."
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: "12px",
                  background: "#090d16",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: "12px", top: "11px", color: "#64748b" }}>
                <IconSearch size={16} />
              </span>
            </div>

            {/* Category Pills */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "8px",
                marginBottom: "12px",
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: "none",
                    background:
                      selectedCategory === cat.id ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    color: selectedCategory === cat.id ? "#38bdf8" : "#94a3b8",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Location List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                maxHeight: "340px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {filteredDestinations.map((item) => {
                const isTarget = targetNodeId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectDestination(item.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      background: isTarget ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      border: isTarget
                        ? "1px solid rgba(59, 130, 246, 0.4)"
                        : "1px solid rgba(255, 255, 255, 0.06)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 120ms ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "0.66rem",
                            padding: "2px 5px",
                            borderRadius: "4px",
                            background: "rgba(255,255,255,0.08)",
                            color: "#38bdf8",
                            fontWeight: 800,
                          }}
                        >
                          {item.code}
                        </span>
                        <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                          {item.name}
                        </h4>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {item.block} · {getFloorLabel(item.floor)}
                      </span>
                    </div>

                    <IconChevronRight size={14} color="#64748b" />
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: INTERACTIVE CAMPUS MAP & STEP DIRECTIONS */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Main Map Canvas */}
          <div style={{ position: "relative" }}>
            <CampusMapCanvas
              campusData={campusData}
              currentFloor={currentFloor}
              onChangeFloor={(f) => setCurrentFloor(f)}
              startNodeId={startNodeId}
              targetNodeId={targetNodeId}
              activeRoute={activeRoute}
              onSelectNode={(node, role) => {
                if (role === "start") {
                  setStartNodeId(node.id);
                } else {
                  handleSelectDestination(node.id);
                }
              }}
              onUpdateCampusData={(updated) => setCampusData(updated)}
            />
          </div>

          {/* Turn-By-Turn Steps Card */}
          {turnDirections.length > 0 && (
            <div
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#10b981", letterSpacing: "0.05em" }}>
                    STEP-BY-STEP DIRECTIONS
                  </span>
                  <h3 style={{ margin: "2px 0 0 0", fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                    Route to {targetNodeObj?.name || "Destination"}
                  </h3>
                </div>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {turnDirections.length} Steps
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                {turnDirections.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.07)",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background:
                          idx === 0
                            ? "#10b981"
                            : idx === turnDirections.length - 1
                            ? "#ef4444"
                            : "rgba(56, 189, 248, 0.2)",
                        color: idx === 0 || idx === turnDirections.length - 1 ? "#fff" : "#38bdf8",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.78rem",
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {step.step}
                    </div>

                    <div>
                      <h5 style={{ margin: "0 0 2px 0", fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                        {step.title}
                      </h5>
                      <p style={{ margin: 0, fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.3 }}>
                        {step.instruction}
                      </p>
                      <span style={{ display: "inline-block", marginTop: "4px", fontSize: "0.68rem", color: "#64748b" }}>
                        {getFloorLabel(step.floor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* AR LIVE CAMERA MODAL OVERLAY */}
      {isArActive && (
        <ARCameraOverlay
          campusData={campusData}
          startNodeId={startNodeId}
          targetNodeId={targetNodeId}
          activeRoute={activeRoute}
          onClose={() => setIsArActive(false)}
        />
      )}
    </div>
  );
}
