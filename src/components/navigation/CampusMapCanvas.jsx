"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  IconCompass as Compass,
  IconZoomIn as ZoomIn,
  IconZoomOut as ZoomOut,
  IconMaximize as Maximize2,
  IconNavigation as Navigation,
  IconMapPin as MapPin,
  IconLayers as Layers,
  IconSparkles as Sparkles,
  IconPlus as Plus,
  IconTrash as Trash2,
  IconLink as LinkIcon,
  IconRotateCw as RotateCcw,
  IconQrCode as QrCode,
  IconCheck as Check,
  IconX as X,
  IconSliders as Sliders,
  IconFootprints as Footprints,
  IconBookOpen as BookOpen,
  IconLaptop as Laptop,
  IconGraduationCap as GraduationCap,
  IconUtensils as Utensils,
  IconCoffee as Coffee,
} from "@/components/navigation/NavIcons";
import { FLOORS, getFloorLabel } from "@/lib/campus-navigation/engine";

export default function CampusMapCanvas({
  campusData,
  currentFloor,
  onChangeFloor,
  startNodeId,
  targetNodeId,
  activeRoute,
  onSelectNode,
  onUpdateCampusData,
  isEditorOpen,
  setIsEditorOpen,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Pan and Zoom transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Map Studio (Editor) State
  const [editTool, setEditTool] = useState("select"); // 'select' | 'add_node' | 'connect' | 'delete'
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectStartNodeId, setConnectStartNodeId] = useState(null);
  const [newNodeForm, setNewNodeForm] = useState(null);
  const [qrModalNode, setQrModalNode] = useState(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Filter nodes & edges for the current floor
  const floorNodes = useMemo(() => {
    return campusData.nodes.filter(
      (n) => n.floor === currentFloor || (currentFloor === "outdoors" && n.floor === "outdoors")
    );
  }, [campusData.nodes, currentFloor]);

  const floorNodeIds = useMemo(() => new Set(floorNodes.map((n) => n.id)), [floorNodes]);

  const floorEdges = useMemo(() => {
    return campusData.edges.filter((e) => {
      // Show edge if both endpoints are on this floor
      return floorNodeIds.has(e.from) && floorNodeIds.has(e.to);
    });
  }, [campusData.edges, floorNodeIds]);

  // Route segments on current floor
  const routePointsOnFloor = useMemo(() => {
    if (!activeRoute || !activeRoute.pathNodes) return [];
    return activeRoute.pathNodes.filter((n) => n.floor === currentFloor);
  }, [activeRoute, currentFloor]);

  // Build SVG path data for route if consecutive nodes are on current floor
  const routeSvgSegments = useMemo(() => {
    if (!activeRoute || !activeRoute.pathNodes || activeRoute.pathNodes.length < 2) return [];

    const segments = [];
    const pNodes = activeRoute.pathNodes;

    for (let i = 0; i < pNodes.length - 1; i++) {
      const a = pNodes[i];
      const b = pNodes[i + 1];
      if (a.floor === currentFloor && b.floor === currentFloor) {
        segments.push(`M ${a.x} ${a.y} L ${b.x} ${b.y}`);
      }
    }
    return segments;
  }, [activeRoute, currentFloor]);

  // Handle Drag / Pan
  const handlePointerDown = (e) => {
    if (e.target.closest(".canvas-interactive-node") && editTool !== "select") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoom = (factor) => {
    setTransform((prev) => {
      const nextScale = Math.min(3.2, Math.max(0.55, prev.scale * factor));
      return { ...prev, scale: nextScale };
    });
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Auto-center when route changes or floor changes
  useEffect(() => {
    if (routePointsOnFloor.length > 0) {
      // Find bounding center of route on this floor
      const avgX = routePointsOnFloor.reduce((acc, n) => acc + n.x, 0) / routePointsOnFloor.length;
      const avgY = routePointsOnFloor.reduce((acc, n) => acc + n.y, 0) / routePointsOnFloor.length;
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Center the avgX, avgY in the 1000x1000 coordinate space
        const targetX = clientWidth / 2 - avgX * transform.scale;
        const targetY = clientHeight / 2 - avgY * transform.scale;
        setTransform((prev) => ({ ...prev, x: targetX, y: targetY }));
      }
    }
  }, [currentFloor, activeRoute]);

  // Canvas Click (for Studio Mapper Node Placement)
  const handleSvgClick = (e) => {
    if (editTool !== "add_node" || !isEditorOpen) return;
    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM().inverse();
    const svgPoint = pt.matrixTransform(ctm);

    const x = Math.round(svgPoint.x);
    const y = Math.round(svgPoint.y);

    setNewNodeForm({
      id: `custom_${Date.now()}`,
      name: "",
      code: `RM-${Math.floor(100 + Math.random() * 900)}`,
      floor: currentFloor,
      block: currentFloor === "outdoors" ? "Campus" : "Academic Block",
      type: "room",
      category: "classroom",
      x,
      y,
      description: "Custom created room or point",
      tags: [],
    });
  };

  const handleSaveNewNode = () => {
    if (!newNodeForm || !newNodeForm.name.trim()) return;
    const updated = {
      ...campusData,
      nodes: [...campusData.nodes, newNodeForm],
    };
    onUpdateCampusData(updated);
    setSelectedNodeId(newNodeForm.id);
    setNewNodeForm(null);
  };

  // Handle Node Interaction in Map Studio
  const handleNodeClick = (node, e) => {
    e.stopPropagation();

    if (isEditorOpen) {
      if (editTool === "delete") {
        // Delete Node and associated edges
        const updated = {
          ...campusData,
          nodes: campusData.nodes.filter((n) => n.id !== node.id),
          edges: campusData.edges.filter((e) => e.from !== node.id && e.to !== node.id),
        };
        onUpdateCampusData(updated);
        setSelectedNodeId(null);
        return;
      }

      if (editTool === "connect") {
        if (!connectStartNodeId) {
          setConnectStartNodeId(node.id);
        } else if (connectStartNodeId !== node.id) {
          // Calculate distance
          const startN = campusData.nodes.find((n) => n.id === connectStartNodeId);
          const dx = (startN.x - node.x);
          const dy = (startN.y - node.y);
          const dist = Math.max(5, Math.round(Math.sqrt(dx * dx + dy * dy) * 0.2));

          const newEdge = {
            from: connectStartNodeId,
            to: node.id,
            dist,
            type: startN.type === "stairs" && node.type === "stairs" ? "stairs" : "walkway",
            vertical: startN.floor !== node.floor,
          };

          const updated = {
            ...campusData,
            edges: [...campusData.edges, newEdge],
          };
          onUpdateCampusData(updated);
          setConnectStartNodeId(null);
        }
        return;
      }
    }

    // Default select node
    setSelectedNodeId(node.id);
    if (onSelectNode) onSelectNode(node);
  };

  // Helper for Category Icon
  const getCategoryIcon = (node) => {
    switch (node.category) {
      case "classroom":
        return <GraduationCap size={14} />;
      case "lab":
        return <Laptop size={14} />;
      case "amenity":
        return node.tags.includes("food") ? <Utensils size={14} /> : <Coffee size={14} />;
      case "stairs":
        return <Layers size={14} />;
      case "gate":
        return <Footprints size={14} />;
      default:
        return <BookOpen size={14} />;
    }
  };

  const selectedNodeObj = useMemo(() => {
    return campusData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [campusData.nodes, selectedNodeId]);

  return (
    <div
      ref={containerRef}
      className="campus-canvas-wrapper"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "relative",
        width: "100%",
        height: "560px",
        background: "radial-gradient(ellipse at 50% 50%, #0d1527 0%, #060913 100%)",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* High-tech Canvas Background Grid */}
      <div
        className="canvas-bg-grid"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      {/* TOP FLOATING CONTROLS: Floor Switcher */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          right: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            background: "rgba(10, 16, 31, 0.88)",
            backdropFilter: "blur(12px)",
            padding: "4px",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            pointerEvents: "auto",
          }}
        >
          {FLOORS.map((f) => {
            const isActive = currentFloor === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onChangeFloor(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: isActive
                    ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                    : "transparent",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  fontSize: "0.78rem",
                  fontWeight: isActive ? 800 : 600,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  boxShadow: isActive ? "0 2px 10px rgba(59, 130, 246, 0.4)" : "none",
                }}
              >
                {f.short}
              </button>
            );
          })}
        </div>

        {/* Mapper Tool Toggle */}
        <div style={{ display: "flex", gap: "8px", pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            style={{
              padding: "7px 12px",
              background: isEditorOpen
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "0.76rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
            }}
          >
            <Sliders size={14} />
            <span>{isEditorOpen ? "Exit Studio" : "Map Studio"}</span>
          </button>
        </div>
      </div>

      {/* MAP STUDIO TOOLBAR (When Editor is active) */}
      {isEditorOpen && (
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 14,
            zIndex: 35,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(16px)",
            padding: "8px",
            borderRadius: "14px",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#10b981", letterSpacing: "0.06em", padding: "0 4px" }}>
            STUDIO TOOLS
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => { setEditTool("select"); setConnectStartNodeId(null); }}
              title="Select / View Room"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: editTool === "select" ? "#10b981" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Navigation size={14} />
            </button>
            <button
              type="button"
              onClick={() => { setEditTool("add_node"); setConnectStartNodeId(null); }}
              title="Add New Room/Waypoint"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: editTool === "add_node" ? "#10b981" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => { setEditTool("connect"); setConnectStartNodeId(null); }}
              title="Connect Walkable Hallway"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: editTool === "connect" ? "#10b981" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <LinkIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => { setEditTool("delete"); setConnectStartNodeId(null); }}
              title="Delete Room or Node"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: editTool === "delete" ? "#ef4444" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
          {editTool === "add_node" && (
            <span style={{ fontSize: "0.7rem", color: "#38bdf8", padding: "2px 4px" }}>
              Click anywhere on map to drop a point
            </span>
          )}
          {editTool === "connect" && (
            <span style={{ fontSize: "0.7rem", color: "#38bdf8", padding: "2px 4px" }}>
              {connectStartNodeId ? "Now click 2nd point to link" : "Click 1st point"}
            </span>
          )}
        </div>
      )}

      {/* FLOATING ZOOM & RE-CENTER CONTROLS (Bottom Right) */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 14,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={() => handleZoom(1.25)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.8)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          title="Recenter"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* SVG INTERACTIVE GRAPH CANVAS */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 1000"
        onClick={handleSvgClick}
        style={{
          width: "100%",
          height: "100%",
          cursor: isDragging ? "grabbing" : editTool === "add_node" ? "crosshair" : "grab",
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 120ms ease-out",
        }}
      >
        <defs>
          {/* Glowing Filter for Navigation Path */}
          <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradients */}
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <radialGradient id="nodePulsar" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.8)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
          </radialGradient>
        </defs>

        {/* 1. Floor Layout Background Schematics */}
        {currentFloor === "outdoors" ? (
          <g className="outdoors-schematic" opacity="0.6">
            {/* Campus Boundary Outline */}
            <rect x="80" y="80" width="840" height="840" rx="30" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeDasharray="8 8" />
            {/* Cricket / Sports Field */}
            <ellipse cx="860" cy="380" rx="100" ry="70" fill="rgba(34, 197, 94, 0.08)" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="2" />
            <text x="860" y="380" fill="#4ade80" fontSize="12" textAnchor="middle" fontWeight="700">SPORTS GROUND</text>
            {/* Central Quadrangle Green Lawn */}
            <circle cx="500" cy="550" r="80" fill="rgba(16, 185, 129, 0.09)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="2" />
            <text x="500" y="555" fill="#34d399" fontSize="11" textAnchor="middle" fontWeight="700">CENTRAL QUADRANGLE</text>
            {/* Building Footprints */}
            <rect x="360" y="240" width="280" height="180" rx="16" fill="rgba(59, 130, 246, 0.08)" stroke="rgba(59, 130, 246, 0.35)" strokeWidth="2" />
            <text x="500" y="320" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="800">ADMINISTRATIVE BLOCK</text>

            <rect x="680" y="440" width="220" height="300" rx="16" fill="rgba(147, 51, 234, 0.08)" stroke="rgba(147, 51, 234, 0.35)" strokeWidth="2" />
            <text x="790" y="570" fill="#c084fc" fontSize="13" textAnchor="middle" fontWeight="800">CSE / ISE BLOCK</text>

            <rect x="100" y="440" width="220" height="300" rx="16" fill="rgba(234, 88, 12, 0.08)" stroke="rgba(234, 88, 12, 0.35)" strokeWidth="2" />
            <text x="210" y="570" fill="#fb923c" fontSize="13" textAnchor="middle" fontWeight="800">MECHANICAL BLOCK</text>
          </g>
        ) : (
          <g className="indoor-floorplan" opacity="0.75">
            {/* Architectural Hallways & Rooms outline */}
            <rect x="120" y="260" width="760" height="520" rx="20" fill="rgba(15, 23, 42, 0.6)" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
            {/* Central Corridor */}
            <line x1="240" y1="520" x2="760" y2="520" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="36" strokeLinecap="round" />
            {/* Wing Corridors */}
            <line x1="740" y1="460" x2="740" y2="720" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="32" strokeLinecap="round" />
            <line x1="260" y1="460" x2="260" y2="720" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="32" strokeLinecap="round" />
            <line x1="500" y1="440" x2="500" y2="720" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="32" strokeLinecap="round" />
          </g>
        )}

        {/* 2. Walkable Hallway Graph Edges (Corridors) */}
        <g className="canvas-edges">
          {floorEdges.map((e, idx) => {
            const nodeA = campusData.nodes.find((n) => n.id === e.from);
            const nodeB = campusData.nodes.find((n) => n.id === e.to);
            if (!nodeA || !nodeB) return null;

            return (
              <line
                key={`edge_${idx}`}
                x1={nodeA.x}
                y1={nodeA.y}
                x2={nodeB.x}
                y2={nodeB.y}
                stroke={e.type === "stairs" ? "#a855f7" : "rgba(255, 255, 255, 0.18)"}
                strokeWidth={e.type === "stairs" ? "3" : "2"}
                strokeDasharray={e.type === "stairs" ? "4 4" : "none"}
              />
            );
          })}
        </g>

        {/* 3. ACTIVE NAVIGATION ROUTE (Glowing animated path) */}
        {routeSvgSegments.length > 0 && (
          <g className="canvas-active-route" filter="url(#routeGlow)">
            {/* Pulsating back-layer */}
            {routeSvgSegments.map((d, idx) => (
              <path
                key={`route_glow_${idx}`}
                d={d}
                fill="none"
                stroke="rgba(6, 182, 212, 0.4)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {/* Main high-tech line */}
            {routeSvgSegments.map((d, idx) => (
              <path
                key={`route_line_${idx}`}
                d={d}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 6"
                className="animated-route-dash"
              />
            ))}
          </g>
        )}

        {/* 4. Floor Nodes (Classrooms, Labs, Gates, Stairs) */}
        <g className="canvas-nodes">
          {floorNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isStart = startNodeId === node.id;
            const isTarget = targetNodeId === node.id;
            const isConnectCandidate = connectStartNodeId === node.id;

            let nodeColor = "#3b82f6";
            if (node.category === "lab") nodeColor = "#06b6d4";
            if (node.category === "amenity") nodeColor = "#f59e0b";
            if (node.category === "stairs") nodeColor = "#a855f7";
            if (node.category === "office") nodeColor = "#ec4899";
            if (node.category === "gate") nodeColor = "#10b981";

            if (isStart) nodeColor = "#10b981";
            if (isTarget) nodeColor = "#ef4444";

            return (
              <g
                key={node.id}
                className="canvas-interactive-node"
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => handleNodeClick(node, e)}
                style={{ cursor: "pointer" }}
              >
                {/* Pulsing ring for Target / Start / Selected */}
                {(isTarget || isStart || isSelected || isConnectCandidate) && (
                  <circle
                    r={isSelected || isTarget ? "26" : "20"}
                    fill="none"
                    stroke={isTarget ? "#ef4444" : isStart ? "#10b981" : "#38bdf8"}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.9"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node Base Pin */}
                <circle
                  r={isStart || isTarget ? "14" : node.type === "corridor" ? "6" : "11"}
                  fill={nodeColor}
                  stroke="#ffffff"
                  strokeWidth={isStart || isTarget ? "2.5" : "1.5"}
                  style={{
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
                    transition: "transform 150ms ease",
                  }}
                />

                {/* Text Label for Rooms & Facilities */}
                {node.type !== "corridor" && (
                  <g transform="translate(0, 18)">
                    <rect
                      x="-50"
                      y="-2"
                      width="100"
                      height="18"
                      rx="6"
                      fill="rgba(10, 15, 29, 0.85)"
                      stroke={isSelected ? nodeColor : "rgba(255,255,255,0.12)"}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="11"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {node.code || node.name.slice(0, 14)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* SELECTED NODE BOTTOM INFO SHEET */}
      {selectedNodeObj && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 14,
            maxWidth: "340px",
            background: "rgba(10, 16, 31, 0.94)",
            backdropFilter: "blur(16px)",
            padding: "14px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
            zIndex: 40,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <div>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#38bdf8",
                  letterSpacing: "0.06em",
                }}
              >
                {selectedNodeObj.block} · {getFloorLabel(selectedNodeObj.floor)}
              </span>
              <h3 style={{ margin: "2px 0 0 0", fontSize: "0.95rem", color: "#ffffff", fontWeight: 800 }}>
                {selectedNodeObj.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ margin: "6px 0 10px 0", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4 }}>
            {selectedNodeObj.description}
          </p>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                if (onSelectNode) onSelectNode(selectedNodeObj, "start");
              }}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.18)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "#10b981",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Set as Start
            </button>
            <button
              type="button"
              onClick={() => {
                if (onSelectNode) onSelectNode(selectedNodeObj, "destination");
              }}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "0.74rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4)",
              }}
            >
              Navigate Here
            </button>
            <button
              type="button"
              onClick={() => setQrModalNode(selectedNodeObj)}
              title="Print QR Checkpoint for this Room"
              style={{
                padding: "7px 10px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                cursor: "pointer",
              }}
            >
              <QrCode size={15} />
            </button>
          </div>
        </div>
      )}

      {/* NEW NODE CREATION POPUP (STUDIO MAPPER) */}
      {newNodeForm && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(15, 23, 42, 0.98)",
            backdropFilter: "blur(20px)",
            padding: "20px",
            borderRadius: "18px",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            zIndex: 60,
            width: "320px",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", color: "#fff", fontSize: "1rem", fontWeight: 800 }}>
            Add Campus Point
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
              Room / Location Name:
              <input
                type="text"
                value={newNodeForm.name}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, name: e.target.value })}
                placeholder="e.g. Robotics Center / Room 304"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: "0.85rem",
                }}
              />
            </label>

            <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
              Room Code:
              <input
                type="text"
                value={newNodeForm.code}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, code: e.target.value })}
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: "0.85rem",
                }}
              />
            </label>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={handleSaveNewNode}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "10px",
                  background: "#10b981",
                  border: "none",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Save Point
              </button>
              <button
                type="button"
                onClick={() => setNewNodeForm(null)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#cbd5e1",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CHECKPOINT PRINT MODAL */}
      {qrModalNode && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            display: "grid",
            placeItems: "center",
            zIndex: 70,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#0f172a",
              padding: "24px",
              borderRadius: "20px",
              textAlign: "center",
              maxWidth: "320px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#2563eb", letterSpacing: "0.08em" }}>
              SVIT INDOOR GPS CHECKPOINT
            </span>
            <h3 style={{ margin: "4px 0 2px 0", fontSize: "1.1rem", fontWeight: 900 }}>
              {qrModalNode.name}
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "0.8rem", color: "#64748b" }}>
              Code: {qrModalNode.code} · {getFloorLabel(qrModalNode.floor)}
            </p>

            {/* Generated Mock QR Pattern */}
            <div
              style={{
                width: "180px",
                height: "180px",
                margin: "0 auto 16px auto",
                background: "#000",
                padding: "10px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              >
                <QrCode size={110} color="#000000" />
                <span style={{ fontSize: "0.62rem", fontFamily: "monospace", fontWeight: 900, marginTop: "4px" }}>
                  SVIT:{qrModalNode.id}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.74rem", color: "#475569", margin: "0 0 14px 0" }}>
              Print and stick this QR badge outside the room or at the pillar. Students can scan it with their camera to instantly calibrate indoor navigation!
            </p>

            <button
              type="button"
              onClick={() => setQrModalNode(null)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                background: "#0f172a",
                color: "#ffffff",
                border: "none",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
